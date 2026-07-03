import type { OutputType, ScriptType } from './types';

/**
 * Weight-unit tables for fee estimation. Work in integer weight units (WU)
 * and divide by 4 at the end — no floating point drift.
 *
 * Input weights assume a 72-byte DER signature (high estimate) for ECDSA and
 * a 64-byte schnorr signature for taproot key-path spends.
 */

/** version(4) + in-count(1) + out-count(1) + locktime(4) = 10 base bytes ×4, + segwit marker/flag (2 WU). */
const OVERHEAD_WU = 42;

const INPUT_WU: Record<ScriptType, number> = {
  // outpoint(36) + scriptlen(1) + sequence(4) = 41 base ×4 = 164; witness: 1 + (1+72) + (1+33) = 108
  p2wpkh: 272,
  // 164 + witness: 1 + (1+64) = 66
  p2tr: 230,
};

const OUTPUT_WU: Record<OutputType, number> = {
  p2wpkh: 124, // 8 + 1 + 22 = 31 vB
  p2pkh: 136, //  8 + 1 + 25 = 34 vB
  p2sh: 128, //   8 + 1 + 23 = 32 vB
  p2wsh: 172, //  8 + 1 + 34 = 43 vB
  p2tr: 172, //   8 + 1 + 34 = 43 vB
  unknown: 172, // assume largest standard output
};

/**
 * Dust thresholds per output type (Bitcoin Core relay policy at 3 sat/vB).
 * An output below this is unrelayable — fold it into the fee instead.
 */
const DUST: Record<OutputType, bigint> = {
  p2pkh: 546n,
  p2sh: 540n,
  p2wpkh: 294n,
  p2wsh: 330n,
  p2tr: 330n,
  unknown: 546n,
};

export function dustThreshold(type: OutputType): bigint {
  return DUST[type];
}

/**
 * Estimated virtual size for a tx spending our inputs to the given outputs.
 * Assumes at least one segwit input (always true for Satchel wallets) and
 * fewer than 253 inputs/outputs (varint stays 1 byte).
 */
export function estimateVsize(inputs: ScriptType[], outputs: OutputType[]): number {
  const weight =
    OVERHEAD_WU +
    inputs.reduce((sum, t) => sum + INPUT_WU[t], 0) +
    outputs.reduce((sum, t) => sum + OUTPUT_WU[t], 0);
  return Math.ceil(weight / 4);
}

/** Fee in sats for the given shape at `feeRate` sat/vB (fractional rates allowed). */
export function estimateFee(
  inputs: ScriptType[],
  outputs: OutputType[],
  feeRate: number,
): bigint {
  if (!(feeRate > 0) || !Number.isFinite(feeRate)) {
    throw new Error(`Invalid fee rate: ${feeRate}`);
  }
  return BigInt(Math.ceil(estimateVsize(inputs, outputs) * feeRate));
}

/** Marginal cost of adding one input at `feeRate` — used for effective-value filtering. */
export function inputCost(type: ScriptType, feeRate: number): bigint {
  return BigInt(Math.ceil((INPUT_WU[type] / 4) * feeRate));
}
