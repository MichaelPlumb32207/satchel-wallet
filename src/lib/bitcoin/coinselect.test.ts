import { describe, expect, it } from 'vitest';
import { feeAndChange, selectCoins, selectMax, type SelectableUtxo } from './coinselect';
import { estimateFee } from './fees';

let counter = 0;
function utxo(value: bigint): SelectableUtxo {
  return { txid: 'ab'.repeat(32), vout: counter++, value, scriptType: 'p2wpkh' };
}

describe('selectCoins', () => {
  it('selects a single covering utxo with correct fee and change', () => {
    const result = selectCoins([utxo(100_000n)], {
      amount: 50_000n,
      recipientTypes: ['p2wpkh'],
      feeRate: 1,
    });
    if (!result.ok) throw new Error('expected success');
    expect(result.inputs).toHaveLength(1);
    expect(result.fee).toBe(141n); // 1-in-2-out p2wpkh @ 1 sat/vB
    expect(result.change).toBe(100_000n - 50_000n - 141n);
  });

  it('prefers larger utxos (fewer inputs)', () => {
    const utxos = [utxo(5_000n), utxo(80_000n), utxo(3_000n)];
    const result = selectCoins(utxos, {
      amount: 60_000n,
      recipientTypes: ['p2wpkh'],
      feeRate: 1,
    });
    if (!result.ok) throw new Error('expected success');
    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0].value).toBe(80_000n);
  });

  it('folds sub-dust change into the fee', () => {
    const result = selectCoins([utxo(50_400n)], {
      amount: 50_000n,
      recipientTypes: ['p2wpkh'],
      feeRate: 1,
    });
    if (!result.ok) throw new Error('expected success');
    expect(result.change).toBe(0n);
    expect(result.fee).toBe(400n); // everything left over
  });

  it('skips utxos that cost more to spend than their value', () => {
    // 50 sats < 68-sat input cost at 1 sat/vB
    const result = selectCoins([utxo(50n)], {
      amount: 10n,
      recipientTypes: ['p2wpkh'],
      feeRate: 1,
    });
    expect(result.ok).toBe(false);
  });

  it('reports how much is missing on insufficient funds', () => {
    const result = selectCoins([utxo(10_000n)], {
      amount: 20_000n,
      recipientTypes: ['p2wpkh'],
      feeRate: 1,
    });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('insufficient-funds');
    // needs 20_000 + 110 (1-in-1-out, no change) - 10_000
    expect(result.missing).toBe(10_110n);
  });

  it('accumulates multiple utxos when needed', () => {
    const result = selectCoins([utxo(30_000n), utxo(30_000n), utxo(30_000n)], {
      amount: 55_000n,
      recipientTypes: ['p2wpkh'],
      feeRate: 2,
    });
    if (!result.ok) throw new Error('expected success');
    expect(result.inputs).toHaveLength(2);
    const total = 60_000n;
    expect(result.fee + result.change + 55_000n).toBe(total);
  });
});

describe('feeAndChange (manual coin control)', () => {
  it('computes fee/change for a fixed input set', () => {
    const inputs = [utxo(40_000n), utxo(40_000n)];
    const outcome = feeAndChange(inputs, 60_000n, ['p2wpkh'], 1);
    expect(outcome).not.toBeNull();
    expect(outcome!.fee).toBe(estimateFee(['p2wpkh', 'p2wpkh'], ['p2wpkh', 'p2wpkh'], 1));
    expect(outcome!.change).toBe(80_000n - 60_000n - outcome!.fee);
  });

  it('returns null when the fixed inputs cannot cover the send', () => {
    expect(feeAndChange([utxo(10_000n)], 20_000n, ['p2wpkh'], 1)).toBeNull();
  });
});

describe('selectMax', () => {
  it('spends all economical utxos with no change', () => {
    const result = selectMax([utxo(30_000n), utxo(20_000n)], ['p2wpkh'], 1);
    if ('ok' in result) throw new Error('expected success');
    expect(result.inputs).toHaveLength(2);
    expect(result.fee).toBe(178n); // 2-in-1-out p2wpkh @ 1 sat/vB
    expect(result.amount).toBe(50_000n - 178n);
  });

  it('excludes uneconomical dust from the sweep', () => {
    const result = selectMax([utxo(30_000n), utxo(10n)], ['p2wpkh'], 1);
    if ('ok' in result) throw new Error('expected success');
    expect(result.inputs).toHaveLength(1);
  });

  it('fails cleanly when nothing is spendable', () => {
    const result = selectMax([utxo(10n)], ['p2wpkh'], 5);
    expect('ok' in result && result.ok === false).toBe(true);
  });
});
