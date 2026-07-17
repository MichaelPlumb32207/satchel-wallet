import { describe, expect, it } from 'vitest';
import { balanceFromAddressInfo } from './useWalletData';
import type { AddressInfo } from '@/lib/api/types';

function info(
  chain: { funded: number; spent: number; txs?: number },
  mempool: { funded: number; spent: number; txs?: number } = {
    funded: 0,
    spent: 0,
  },
): AddressInfo {
  return {
    address: 'bc1qtest',
    chain_stats: {
      funded_txo_count: 1,
      funded_txo_sum: chain.funded,
      spent_txo_count: 0,
      spent_txo_sum: chain.spent,
      tx_count: chain.txs ?? 1,
    },
    mempool_stats: {
      funded_txo_count: 0,
      funded_txo_sum: mempool.funded,
      spent_txo_count: 0,
      spent_txo_sum: mempool.spent,
      tx_count: mempool.txs ?? 0,
    },
  };
}

describe('balanceFromAddressInfo', () => {
  it('sums confirmed chain balance', () => {
    const b = balanceFromAddressInfo(info({ funded: 100_000, spent: 40_000 }));
    expect(b.confirmed).toBe(60_000n);
    expect(b.pending).toBe(0n);
    expect(b.total).toBe(60_000n);
  });

  it('includes mempool-funded sats as pending', () => {
    const b = balanceFromAddressInfo(
      info({ funded: 50_000, spent: 0 }, { funded: 12_000, spent: 0, txs: 1 }),
    );
    expect(b.confirmed).toBe(50_000n);
    expect(b.pending).toBe(12_000n);
    expect(b.total).toBe(62_000n);
  });

  it('handles fully spent addresses (used, zero balance)', () => {
    const b = balanceFromAddressInfo(info({ funded: 10_000, spent: 10_000 }));
    expect(b.total).toBe(0n);
  });
});
