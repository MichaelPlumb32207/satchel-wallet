import { describe, expect, it } from 'vitest';
import type { Tx, Vin, Vout } from '@/lib/api/types';
import { classifyTxs } from './history';

const OUR_1 = 'bc1qours1';
const OUR_2 = 'bc1qours2';
const THEM = 'bc1qthem';
const ours = new Set([OUR_1, OUR_2]);

function vin(address: string, value: number, sequence = 0xfffffffd): Vin {
  return {
    txid: 'f'.repeat(64),
    vout: 0,
    is_coinbase: false,
    sequence,
    prevout: { scriptpubkey: '', scriptpubkey_type: 'v0_p2wpkh', scriptpubkey_address: address, value },
  };
}

function vout(address: string, value: number): Vout {
  return { scriptpubkey: '', scriptpubkey_type: 'v0_p2wpkh', scriptpubkey_address: address, value };
}

function tx(partial: Partial<Tx> & Pick<Tx, 'txid' | 'vin' | 'vout'>): Tx {
  return {
    version: 2,
    locktime: 0,
    size: 200,
    weight: 500,
    fee: 200,
    status: { confirmed: true, block_height: 100, block_time: 1_700_000_000 },
    ...partial,
  };
}

describe('classifyTxs', () => {
  it('classifies incoming payments', () => {
    const [result] = classifyTxs(
      [tx({ txid: 'a'.repeat(64), vin: [vin(THEM, 60_000)], vout: [vout(OUR_1, 50_000), vout(THEM, 9_800)] })],
      ours,
    );
    expect(result.direction).toBe('in');
    expect(result.netSats).toBe(50_000n);
    expect(result.fee).toBeNull(); // not our fee
    expect(result.counterparty).toBe(THEM);
    expect(result.bumpable).toBe(false); // we can't bump txs we didn't fund
  });

  it('classifies outgoing payments net of fee and change', () => {
    const [result] = classifyTxs(
      [
        tx({
          txid: 'b'.repeat(64),
          vin: [vin(OUR_1, 100_000)],
          vout: [vout(THEM, 60_000), vout(OUR_2, 39_800)], // change back to us
        }),
      ],
      ours,
    );
    expect(result.direction).toBe('out');
    expect(result.netSats).toBe(-60_200n); // amount + fee
    expect(result.fee).toBe(200n);
    expect(result.counterparty).toBe(THEM);
  });

  it('classifies self-transfers (consolidations)', () => {
    const [result] = classifyTxs(
      [tx({ txid: 'c'.repeat(64), vin: [vin(OUR_1, 50_000)], vout: [vout(OUR_2, 49_800)] })],
      ours,
    );
    expect(result.direction).toBe('self');
    expect(result.netSats).toBe(-200n); // just the fee
  });

  it('flags unconfirmed RBF-signaling sends as bumpable', () => {
    const [bumpable] = classifyTxs(
      [
        tx({
          txid: 'd'.repeat(64),
          vin: [vin(OUR_1, 100_000, 0xfffffffd)],
          vout: [vout(THEM, 99_800)],
          status: { confirmed: false },
        }),
      ],
      ours,
    );
    expect(bumpable.bumpable).toBe(true);

    const [notSignaling] = classifyTxs(
      [
        tx({
          txid: 'e'.repeat(64),
          vin: [vin(OUR_1, 100_000, 0xffffffff)],
          vout: [vout(THEM, 99_800)],
          status: { confirmed: false },
        }),
      ],
      ours,
    );
    expect(notSignaling.bumpable).toBe(false);
  });

  it('dedupes by txid and puts pending first, then newest', () => {
    const confirmed1 = tx({
      txid: '1'.repeat(64),
      vin: [vin(THEM, 10_000)],
      vout: [vout(OUR_1, 9_000)],
      status: { confirmed: true, block_height: 90, block_time: 1_000 },
    });
    const confirmed2 = tx({
      txid: '2'.repeat(64),
      vin: [vin(THEM, 10_000)],
      vout: [vout(OUR_1, 9_000)],
      status: { confirmed: true, block_height: 95, block_time: 2_000 },
    });
    const pending = tx({
      txid: '3'.repeat(64),
      vin: [vin(THEM, 10_000)],
      vout: [vout(OUR_2, 9_000)],
      status: { confirmed: false },
    });
    const result = classifyTxs([confirmed1, pending, confirmed2, confirmed1], ours);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.txid[0])).toEqual(['3', '2', '1']);
  });
});
