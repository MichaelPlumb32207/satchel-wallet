import type { HDKey } from '@scure/bip32';
import { broadcastTx } from '@/lib/api/mempool';
import { outputTypeOf } from '@/lib/bitcoin/addresses';
import {
  feeAndChange,
  selectCoins,
  selectMax,
  type SelectableUtxo,
} from '@/lib/bitcoin/coinselect';
import { deriveAddress, type DerivedAddress } from '@/lib/bitcoin/derivation';
import { dustThreshold, estimateVsize } from '@/lib/bitcoin/fees';
import { buildAndSignTx, type PlannedInput, type PlannedOutput } from '@/lib/bitcoin/psbt';
import type { ScriptType } from '@/lib/bitcoin/types';
import { getNetwork, type NetworkId } from '@/lib/networks';
import { getSigningKey } from '@/lib/vault/keyring';
import type { OwnedUtxo } from '@/hooks/useWalletData';

export interface SendPlan {
  inputs: PlannedInput[];
  outputs: PlannedOutput[];
  recipient: string;
  amount: bigint;
  fee: bigint;
  change: bigint;
  vsize: number;
}

export type PlanResult =
  | { ok: true; plan: SendPlan }
  | { ok: false; error: string; missing?: bigint };

/**
 * Turn user intent into a concrete input/output plan. Pure planning — no
 * signing, no network. Spends confirmed coins plus our own unconfirmed
 * change (safe: we authored it); other people's unconfirmed outputs stay
 * untouchable until they confirm.
 */
export function planSend(opts: {
  utxos: OwnedUtxo[];
  account: HDKey;
  scriptType: ScriptType;
  networkId: NetworkId;
  recipient: string;
  amount: bigint | 'max';
  feeRate: number;
  changeAddress: DerivedAddress;
  manualSelection?: OwnedUtxo[];
}): PlanResult {
  const { networkId, scriptType, account, recipient, feeRate } = opts;

  let recipientType;
  try {
    recipientType = outputTypeOf(recipient, networkId);
  } catch {
    return { ok: false, error: 'Invalid recipient address' };
  }

  const spendable = (opts.manualSelection ?? opts.utxos).filter(
    (u) => u.confirmed || u.chain === 1,
  );
  if (spendable.length === 0) {
    return { ok: false, error: 'No confirmed coins to spend yet' };
  }

  const toPlanned = (u: OwnedUtxo): PlannedInput => ({
    txid: u.txid,
    vout: u.vout,
    value: u.value,
    scriptType: u.scriptType,
    chain: u.chain,
    index: u.index,
    publicKey: deriveAddress(account, scriptType, networkId, u.chain, u.index).publicKey,
  });

  // MAX send: everything economical, no change.
  if (opts.amount === 'max') {
    const result = selectMax(spendable, [recipientType], feeRate);
    if ('ok' in result) return { ok: false, error: 'Nothing spendable at this fee rate' };
    if (result.amount < dustThreshold(recipientType)) {
      return { ok: false, error: 'Balance is too small to send after fees' };
    }
    const inputs = result.inputs.map(toPlanned);
    return {
      ok: true,
      plan: {
        inputs,
        outputs: [{ address: recipient, amount: result.amount }],
        recipient,
        amount: result.amount,
        fee: result.fee,
        change: 0n,
        vsize: estimateVsize(
          inputs.map((i) => i.scriptType),
          [recipientType],
        ),
      },
    };
  }

  if (opts.amount < dustThreshold(recipientType)) {
    return { ok: false, error: 'Amount is below the dust limit for that address type' };
  }

  let selected: SelectableUtxo[] & OwnedUtxo[];
  let fee: bigint;
  let change: bigint;

  if (opts.manualSelection) {
    const outcome = feeAndChange(spendable, opts.amount, [recipientType], feeRate);
    if (!outcome) {
      return { ok: false, error: 'The selected coins don’t cover this amount plus fees' };
    }
    selected = spendable as OwnedUtxo[];
    ({ fee, change } = outcome);
  } else {
    const result = selectCoins(spendable, {
      amount: opts.amount,
      recipientTypes: [recipientType],
      feeRate,
    });
    if (!result.ok) {
      return { ok: false, error: 'Not enough funds for this amount plus fees', missing: result.missing };
    }
    selected = result.inputs;
    ({ fee, change } = result);
  }

  const inputs = selected.map(toPlanned);
  const outputs: PlannedOutput[] = [{ address: recipient, amount: opts.amount }];
  if (change > 0n) outputs.push({ address: opts.changeAddress.address, amount: change });

  return {
    ok: true,
    plan: {
      inputs,
      outputs,
      recipient,
      amount: opts.amount,
      fee,
      change,
      vsize: estimateVsize(
        inputs.map((i) => i.scriptType),
        change > 0n ? [recipientType, 'p2wpkh'] : [recipientType],
      ),
    },
  };
}

/** Sign with the keyring and broadcast. Returns the txid. */
export async function executeSend(
  plan: SendPlan,
  walletId: string,
  scriptType: ScriptType,
  networkId: NetworkId,
): Promise<string> {
  const signed = buildAndSignTx(plan.inputs, plan.outputs, networkId, (chain, index) =>
    getSigningKey(walletId, scriptType, networkId, chain, index),
  );
  await broadcastTx(getNetwork(networkId).apiBase, signed.hex);
  return signed.txid;
}
