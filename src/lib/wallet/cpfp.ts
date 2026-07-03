import type { HDKey } from '@scure/bip32';
import type { Tx } from '@/lib/api/types';
import { deriveAddress, type DerivedAddress } from '@/lib/bitcoin/derivation';
import { dustThreshold, estimateFee, estimateVsize } from '@/lib/bitcoin/fees';
import type { PlannedInput } from '@/lib/bitcoin/psbt';
import type { ScriptType } from '@/lib/bitcoin/types';
import type { NetworkId } from '@/lib/networks';
import type { OwnedUtxo } from '@/hooks/useWalletData';
import { nextFreeChangeIndex } from './bump';
import type { SendPlan } from './send';

export type CpfpResult =
  | {
      ok: true;
      /** A self-payment: the parent's outputs (plus any top-ups) back to our own change. */
      plan: SendPlan;
      parentFee: bigint;
      parentVsize: number;
      parentFeeRate: number;
      /** Rate miners see for parent+child together — what the target buys. */
      packageFeeRate: number;
    }
  | { ok: false; error: string };

/**
 * CPFP "speed up" for a pending payment we RECEIVED. We can't RBF a tx we
 * didn't author, but we can spend its output to ourselves with a fee big
 * enough that miners take parent and child together at `targetRate`.
 *
 *   child_fee = targetRate × (parent_vsize + child_vsize) − parent_fee
 *
 * floored at the child's own 1 sat/vB relay minimum. Pure planning — the
 * caller fetches the parent tx and broadcasts via executeSend().
 *
 * This deliberately spends an unconfirmed output received from someone else —
 * the one exception to the send flow's rule. Safe here because the child pays
 * ourselves: if the sender replaces the parent, the child dies with it and no
 * funds move.
 */
export function planCpfp(opts: {
  parent: Tx;
  networkId: NetworkId;
  scriptType: ScriptType;
  account: HDKey;
  /** address -> derivation info for every address we've derived (both chains). */
  ourAddresses: Map<string, DerivedAddress>;
  /** Current coins — must include the parent's unconfirmed outputs to us. */
  utxos: OwnedUtxo[];
  /** Desired package rate in sat/vB. */
  targetRate: number;
}): CpfpResult {
  const { parent, networkId, scriptType, account, ourAddresses, targetRate } = opts;

  if (!(targetRate > 0) || !Number.isFinite(targetRate)) {
    return { ok: false, error: 'Enter a fee rate above zero' };
  }
  if (parent.status.confirmed) {
    return { ok: false, error: 'This payment already confirmed — nothing to speed up' };
  }

  const parentVsize = Math.ceil(parent.weight / 4);
  const parentFee = BigInt(parent.fee);
  const parentFeeRate = parent.fee / parentVsize;
  if (targetRate <= parentFeeRate) {
    return {
      ok: false,
      error: `It already pays ${parentFeeRate.toFixed(1)} sat/vB — pick a higher rate`,
    };
  }

  // Anchor inputs: the pending payment's outputs that landed on our addresses.
  const inputs: PlannedInput[] = opts.utxos
    .filter((u) => u.txid === parent.txid)
    .map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: u.value,
      scriptType: u.scriptType,
      chain: u.chain,
      index: u.index,
      publicKey: deriveAddress(account, scriptType, networkId, u.chain, u.index).publicKey,
    }));
  if (inputs.length === 0) {
    return { ok: false, error: 'No spendable coins from this payment — it may already be spent' };
  }

  // Extra coins if the anchor can't cover the boost — same trust rule as send.
  const topUps = opts.utxos
    .filter((u) => u.txid !== parent.txid)
    .filter((u) => u.confirmed || u.chain === 1)
    .sort((a, b) => (b.value > a.value ? 1 : -1));

  const changeAddr = deriveAddress(
    account,
    scriptType,
    networkId,
    1,
    nextFreeChangeIndex(ourAddresses),
  ).address;

  for (;;) {
    const inputTypes = inputs.map((i) => i.scriptType);
    const totalIn = inputs.reduce((sum, i) => sum + i.value, 0n);
    const childVsize = estimateVsize(inputTypes, ['p2wpkh']);

    // What the package must pay overall, minus what the parent already paid —
    // but never below the child's own relay minimum.
    const packageFee = BigInt(Math.ceil((parentVsize + childVsize) * targetRate));
    const relayFloor = estimateFee(inputTypes, ['p2wpkh'], 1);
    const boost = packageFee - parentFee;
    const childFee = boost > relayFloor ? boost : relayFloor;

    const amount = totalIn - childFee;
    if (amount >= dustThreshold('p2wpkh')) {
      return {
        ok: true,
        plan: {
          inputs: [...inputs],
          outputs: [{ address: changeAddr, amount }],
          recipient: changeAddr,
          amount,
          fee: childFee,
          change: 0n,
          vsize: childVsize,
        },
        parentFee,
        parentVsize,
        parentFeeRate,
        packageFeeRate: Number(parentFee + childFee) / (parentVsize + childVsize),
      };
    }

    const next = topUps.shift();
    if (!next) {
      return { ok: false, error: 'Not enough funds to speed this payment up' };
    }
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
}
