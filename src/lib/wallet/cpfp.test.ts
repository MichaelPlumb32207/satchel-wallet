import { describe, expect, it } from 'vitest';
import type { Tx } from '@/lib/api/types';
import { deriveAddress, deriveAddressRange } from '@/lib/bitcoin/derivation';
import { deriveAccount } from '@/lib/bitcoin/derivation';
import { mnemonicToSeed } from '@/lib/bitcoin/mnemonic';
import type { OwnedUtxo } from '@/hooks/useWalletData';
import { planCpfp } from './cpfp';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const account = deriveAccount(mnemonicToSeed(MNEMONIC), 'p2wpkh', 'mainnet');

const ourAddresses = new Map(
  [
    ...deriveAddressRange(account, 'p2wpkh', 'mainnet', 0, 0, 5),
    ...deriveAddressRange(account, 'p2wpkh', 'mainnet', 1, 0, 3),
  ].map((a) => [a.address, a]),
);

const PARENT_TXID = 'a'.repeat(64);

/** planCpfp only reads txid, weight, fee, and status from the parent. */
function parentTx(over: Partial<Tx> = {}): Tx {
  return {
    txid: PARENT_TXID,
    version: 2,
    locktime: 0,
    vin: [],
    vout: [],
    size: 200,
    weight: 800, // 200 vB
    fee: 200, // 1 sat/vB
    status: { confirmed: false },
    ...over,
  };
}

function utxo(over: Partial<OwnedUtxo> = {}): OwnedUtxo {
  const chain = over.chain ?? 0;
  const index = over.index ?? 0;
  return {
    txid: PARENT_TXID,
    vout: 0,
    value: 50_000n,
    scriptType: 'p2wpkh',
    address: deriveAddress(account, 'p2wpkh', 'mainnet', chain, index).address,
    chain,
    index,
    confirmed: false,
    ...over,
  };
}

function plan(opts: { parent?: Tx; utxos?: OwnedUtxo[]; targetRate?: number } = {}) {
  return planCpfp({
    parent: opts.parent ?? parentTx(),
    networkId: 'mainnet',
    scriptType: 'p2wpkh',
    account,
    ourAddresses,
    utxos: opts.utxos ?? [utxo()],
    targetRate: opts.targetRate ?? 10,
  });
}

describe('planCpfp', () => {
  it('pays exactly the package shortfall to reach the target rate', () => {
    const result = plan();
    if (!result.ok) throw new Error(result.error);
    // child: 1 p2wpkh input + 1 p2wpkh output = 110 vB
    // package fee at 10 sat/vB over (200 + 110) vB = 3100; parent paid 200
    expect(result.plan.vsize).toBe(110);
    expect(result.plan.fee).toBe(2900n);
    expect(result.plan.amount).toBe(47_100n);
    expect(result.packageFeeRate).toBeCloseTo(10, 5);
    expect(result.parentFeeRate).toBeCloseTo(1, 5);
  });

  it('sends the boost output to our own next free change address', () => {
    const result = plan();
    if (!result.ok) throw new Error(result.error);
    // ourAddresses holds change indices 0-2, so the next free slot is 3
    const expected = deriveAddress(account, 'p2wpkh', 'mainnet', 1, 3).address;
    expect(result.plan.outputs).toHaveLength(1);
    expect(result.plan.outputs[0].address).toBe(expected);
    expect(result.plan.inputs[0].txid).toBe(PARENT_TXID);
  });

  it('spends every output the parent gave us', () => {
    const result = plan({
      utxos: [utxo({ vout: 0, index: 0 }), utxo({ vout: 2, index: 1, value: 20_000n })],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.plan.inputs).toHaveLength(2);
  });

  it('tops up from confirmed coins when the anchor is too small', () => {
    const result = plan({
      utxos: [
        utxo({ value: 1_500n }),
        utxo({ txid: 'b'.repeat(64), value: 100_000n, index: 1, confirmed: true }),
      ],
    });
    if (!result.ok) throw new Error(result.error);
    // 2 inputs + 1 output = 178 vB; package fee ceil((200+178)×10) = 3780 − 200
    expect(result.plan.inputs).toHaveLength(2);
    expect(result.plan.fee).toBe(3580n);
    expect(result.plan.amount).toBe(101_500n - 3_580n);
  });

  it('never tops up with unconfirmed coins received from others', () => {
    const result = plan({
      utxos: [
        utxo({ value: 1_500n }),
        utxo({ txid: 'b'.repeat(64), value: 100_000n, index: 1, confirmed: false }),
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not enough funds/i);
  });

  it('enforces the child relay floor when the parent overpaid in absolute terms', () => {
    // parent: 200 vB at 0.3 sat/vB; target 0.5 → package needs 155, boost 95 < 110 floor
    const result = plan({ parent: parentTx({ fee: 60 }), targetRate: 0.5 });
    if (!result.ok) throw new Error(result.error);
    expect(result.plan.fee).toBe(110n);
  });

  it('rejects a confirmed parent', () => {
    const result = plan({ parent: parentTx({ status: { confirmed: true, block_height: 1 } }) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already confirmed/i);
  });

  it('rejects a target at or below the parent rate', () => {
    const result = plan({ targetRate: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/1\.0 sat\/vB/);
  });

  it('rejects nonsense rates', () => {
    expect(plan({ targetRate: 0 }).ok).toBe(false);
    expect(plan({ targetRate: NaN }).ok).toBe(false);
  });

  it('fails cleanly when the parent gave us nothing spendable', () => {
    const result = plan({ utxos: [utxo({ txid: 'c'.repeat(64), confirmed: true })] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already be spent/i);
  });

  it('fails cleanly when even top-ups cannot cover the boost', () => {
    const result = plan({ utxos: [utxo({ value: 300n })] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not enough funds/i);
  });
});
