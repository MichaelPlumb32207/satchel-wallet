import { dustThreshold, estimateFee, inputCost } from './fees';
import type { OutputType, ScriptType } from './types';

export interface SelectableUtxo {
  txid: string;
  vout: number;
  value: bigint;
  scriptType: ScriptType;
}

export interface SelectionOptions {
  /** Total amount going to recipients (sats). */
  amount: bigint;
  /** Output types of the recipient outputs (usually one). */
  recipientTypes: OutputType[];
  feeRate: number;
  /** Where change goes; determines change output cost + dust threshold. */
  changeType?: ScriptType;
}

export type SelectionResult<T extends SelectableUtxo> =
  | { ok: true; inputs: T[]; fee: bigint; change: bigint }
  | { ok: false; reason: 'insufficient-funds'; missing: bigint };

/**
 * Effective-value accumulative selection: skip UTXOs that cost more to spend
 * than they're worth, take largest-first until the target is covered. If the
 * would-be change is below dust, fold it into the fee (standard practice —
 * the "overpay" is bounded by the dust threshold).
 */
export function selectCoins<T extends SelectableUtxo>(
  utxos: T[],
  opts: SelectionOptions,
): SelectionResult<T> {
  const { amount, recipientTypes, feeRate, changeType = 'p2wpkh' } = opts;

  const economical = utxos
    .filter((u) => u.value > inputCost(u.scriptType, feeRate))
    .sort((a, b) => (b.value > a.value ? 1 : b.value < a.value ? -1 : 0));

  const selected: T[] = [];
  let total = 0n;

  for (const utxo of economical) {
    selected.push(utxo);
    total += utxo.value;

    const outcome = feeAndChange(selected, amount, recipientTypes, feeRate, changeType);
    if (outcome) return { ok: true, inputs: [...selected], ...outcome };
  }

  const feeAllNoChange = estimateFee(
    selected.map((u) => u.scriptType),
    recipientTypes,
    feeRate,
  );
  return {
    ok: false,
    reason: 'insufficient-funds',
    missing: amount + feeAllNoChange - total,
  };
}

/**
 * Fee/change for a FIXED input set (manual coin control uses this directly).
 * Returns null if the inputs can't cover amount + fee.
 */
export function feeAndChange(
  inputs: SelectableUtxo[],
  amount: bigint,
  recipientTypes: OutputType[],
  feeRate: number,
  changeType: ScriptType = 'p2wpkh',
): { fee: bigint; change: bigint } | null {
  const inputTypes = inputs.map((u) => u.scriptType);
  const total = inputs.reduce((sum, u) => sum + u.value, 0n);

  const feeWithChange = estimateFee(inputTypes, [...recipientTypes, changeType], feeRate);
  const change = total - amount - feeWithChange;
  if (change >= dustThreshold(changeType)) {
    return { fee: feeWithChange, change };
  }

  const feeNoChange = estimateFee(inputTypes, recipientTypes, feeRate);
  if (total >= amount + feeNoChange) {
    // Sub-dust remainder folds into the fee.
    return { fee: total - amount, change: 0n };
  }
  return null;
}

/**
 * Send-max: spend every economical UTXO, recipient gets total minus fee.
 * No change output by construction.
 */
export function selectMax<T extends SelectableUtxo>(
  utxos: T[],
  recipientTypes: OutputType[],
  feeRate: number,
): { inputs: T[]; fee: bigint; amount: bigint } | { ok: false; reason: 'nothing-to-send' } {
  const economical = utxos.filter((u) => u.value > inputCost(u.scriptType, feeRate));
  if (economical.length === 0) return { ok: false, reason: 'nothing-to-send' };

  const fee = estimateFee(
    economical.map((u) => u.scriptType),
    recipientTypes,
    feeRate,
  );
  const total = economical.reduce((sum, u) => sum + u.value, 0n);
  const amount = total - fee;
  if (amount <= 0n) return { ok: false, reason: 'nothing-to-send' };
  return { inputs: economical, fee, amount };
}
