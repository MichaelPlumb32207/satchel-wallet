import type { HDKey } from '@scure/bip32';
import { getTx } from '@/lib/api/mempool';
import { deriveAddress, type DerivedAddress } from '@/lib/bitcoin/derivation';
import { dustThreshold, estimateFee } from '@/lib/bitcoin/fees';
import type { PlannedInput, PlannedOutput } from '@/lib/bitcoin/psbt';
import type { ScriptType } from '@/lib/bitcoin/types';
import { getNetwork, type NetworkId } from '@/lib/networks';
import type { OwnedUtxo } from '@/hooks/useWalletData';
import type { SendPlan } from './send';

export type BumpResult =
  | { ok: true; plan: SendPlan; originalFeeRate: number; newFeeRate: number }
  | { ok: false; error: string };

/**
 * RBF fee bump: rebuild an unconfirmed outgoing tx with the same inputs and
 * recipient outputs at a higher fee rate. The increase comes out of our
 * change output; if change can't absorb it, we add more of our coins.
 *
 * BIP125 requires the replacement to pay both a higher fee rate AND at least
 * the original absolute fee + 1 sat/vB × its own vsize — both are enforced.
 */
export async function planBump(opts: {
  txid: string;
  networkId: NetworkId;
  scriptType: ScriptType;
  account: HDKey;
  /** address -> derivation info for every address we've derived (both chains). */
  ourAddresses: Map<string, DerivedAddress>;
  /** Current spendable coins (for topping up if change can't cover the bump). */
  utxos: OwnedUtxo[];
  newFeeRate: number;
}): Promise<BumpResult> {
  const { networkId, scriptType, account, ourAddresses, newFeeRate } = opts;
  const original = await getTx(getNetwork(networkId).apiBase, opts.txid);

  if (original.status.confirmed) {
    return { ok: false, error: 'This transaction already confirmed — nothing to bump' };
  }

  const originalVsize = Math.ceil(original.weight / 4);
  const originalFee = BigInt(original.fee);
  const originalFeeRate = original.fee / originalVsize;
  if (newFeeRate <= originalFeeRate) {
    return {
      ok: false,
      error: `New rate must beat the current ${originalFeeRate.toFixed(1)} sat/vB`,
    };
  }

  // Reclaim every input — all must be ours to re-sign.
  const inputs: PlannedInput[] = [];
  for (const vin of original.vin) {
    const address = vin.prevout?.scriptpubkey_address;
    const derived = address ? ourAddresses.get(address) : undefined;
    if (!derived || !vin.prevout) {
      return { ok: false, error: 'This transaction has inputs Satchel can’t re-sign' };
    }
    inputs.push({
      txid: vin.txid,
      vout: vin.vout,
      value: BigInt(vin.prevout.value),
      scriptType,
      chain: derived.chain,
      index: derived.index,
      publicKey: derived.publicKey,
    });
  }

  // Keep recipient outputs; drop our own change (it absorbs the new fee).
  const keep: PlannedOutput[] = [];
  let changeAddress: string | null = null;
  for (const vout of original.vout) {
    const address = vout.scriptpubkey_address;
    const derived = address ? ourAddresses.get(address) : undefined;
    if (derived && derived.chain === 1) {
      changeAddress = address!;
    } else if (address) {
      keep.push({ address, amount: BigInt(vout.value) });
    } else {
      return { ok: false, error: 'This transaction has non-standard outputs' };
    }
  }
  if (keep.length === 0) {
    return { ok: false, error: 'Nothing to pay after removing change — bump not needed' };
  }

  // Fresh coins we could add — never outputs of the tx being replaced.
  const topUps = opts.utxos
    .filter((u) => u.txid !== opts.txid)
    .filter((u) => u.confirmed || u.chain === 1)
    .filter((u) => !inputs.some((i) => i.txid === u.txid && i.vout === u.vout))
    .sort((a, b) => (b.value > a.value ? 1 : -1));

  const keepSum = keep.reduce((sum, o) => sum + o.amount, 0n);
  const keepTypes = keep.map(() => 'unknown' as const);
  const changeAddr =
    changeAddress ??
    deriveAddress(account, scriptType, networkId, 1, nextFreeChangeIndex(ourAddresses)).address;

  // Try with current inputs, then add top-ups until fee + dust-safe change fit.
  for (;;) {
    const inputTypes = inputs.map((i) => i.scriptType);
    const totalIn = inputs.reduce((sum, i) => sum + i.value, 0n);

    const feeWithChange = requiredFee(
      estimateFee(inputTypes, [...keepTypes, 'p2wpkh'], newFeeRate),
      originalFee,
      inputTypes.length,
      keep.length + 1,
    );
    const change = totalIn - keepSum - feeWithChange;
    if (change >= dustThreshold('p2wpkh')) {
      return finish([...keep, { address: changeAddr, amount: change }], feeWithChange, change);
    }

    const feeNoChange = requiredFee(
      estimateFee(inputTypes, keepTypes, newFeeRate),
      originalFee,
      inputTypes.length,
      keep.length,
    );
    if (totalIn - keepSum >= feeNoChange) {
      return finish([...keep], totalIn - keepSum, 0n);
    }

    const next = topUps.shift();
    if (!next) return { ok: false, error: 'Not enough funds to bump the fee' };
    inputs.push({
      txid: next.txid,
      vout: next.vout,
      value: next.value,
      scriptType: next.scriptType,
      chain: next.chain,
      index: next.index,
      publicKey: deriveAddress(account, scriptType, networkId, next.chain, next.index).publicKey,
    });
  }

  function finish(outputs: PlannedOutput[], fee: bigint, change: bigint): BumpResult {
    return {
      ok: true,
      plan: {
        inputs,
        outputs,
        recipient: keep[0].address,
        amount: keepSum,
        fee,
        change,
        vsize: originalVsize,
      },
      originalFeeRate,
      newFeeRate,
    };
  }
}

/** BIP125 rule 4: replacement fee ≥ target fee AND ≥ original fee + 1 sat/vB × replacement vsize. */
function requiredFee(
  targetFee: bigint,
  originalFee: bigint,
  numInputs: number,
  numOutputs: number,
): bigint {
  // Rough replacement vsize for the incremental-relay floor.
  const vsize = BigInt(11 + numInputs * 68 + numOutputs * 43);
  const floor = originalFee + vsize;
  return targetFee > floor ? targetFee : floor;
}

/** First unused index on the internal change chain, given every derived address. */
export function nextFreeChangeIndex(ourAddresses: Map<string, DerivedAddress>): number {
  let max = -1;
  for (const derived of ourAddresses.values()) {
    if (derived.chain === 1) max = Math.max(max, derived.index);
  }
  return max + 1;
}
