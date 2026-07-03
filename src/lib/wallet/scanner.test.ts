import { describe, expect, it } from 'vitest';
import { deriveAccount, deriveAddressRange } from '@/lib/bitcoin/derivation';
import { mnemonicToSeed } from '@/lib/bitcoin/mnemonic';
import { scanAccount } from './scanner';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const account = deriveAccount(mnemonicToSeed(MNEMONIC), 'p2wpkh', 'mainnet');

function usedSet(chain: 0 | 1, indices: number[]): Set<string> {
  return new Set(
    deriveAddressRange(account, 'p2wpkh', 'mainnet', chain, 0, Math.max(...indices, 0) + 1)
      .filter((a) => indices.includes(a.index))
      .map((a) => a.address),
  );
}

describe('scanAccount', () => {
  it('finds nothing for a fresh wallet and stops at the gap limit', async () => {
    let calls = 0;
    const result = await scanAccount(account, 'p2wpkh', 'mainnet', {
      isUsed: async () => {
        calls++;
        return false;
      },
    });
    expect(result.receive.nextIndex).toBe(0);
    expect(result.change.nextIndex).toBe(0);
    expect(result.usedAddresses).toHaveLength(0);
    // 20-address gap on each chain, probed in batches of 10
    expect(calls).toBe(40);
  });

  it('extends the scan past used addresses until a clean gap', async () => {
    const used = usedSet(0, [0, 3, 25]);
    const result = await scanAccount(account, 'p2wpkh', 'mainnet', {
      isUsed: async (address) => used.has(address),
    });
    expect(result.receive.usedIndices).toEqual([0, 3, 25]);
    expect(result.receive.nextIndex).toBe(26);
    // must have checked at least 26 + 20 gap addresses on the receive chain
    expect(result.receive.addresses.length).toBeGreaterThanOrEqual(46);
    expect(result.change.nextIndex).toBe(0);
  });

  it('scans the change chain independently', async () => {
    const usedReceive = usedSet(0, [1]);
    const usedChange = usedSet(1, [0, 1, 2]);
    const result = await scanAccount(account, 'p2wpkh', 'mainnet', {
      isUsed: async (address) => usedReceive.has(address) || usedChange.has(address),
    });
    expect(result.receive.usedIndices).toEqual([1]);
    expect(result.change.usedIndices).toEqual([0, 1, 2]);
    expect(result.change.nextIndex).toBe(3);
    expect(result.usedAddresses).toHaveLength(4);
  });

  it('reports monotonic progress', async () => {
    const ticks: number[] = [];
    await scanAccount(account, 'p2wpkh', 'mainnet', {
      isUsed: async () => false,
      onProgress: (n) => ticks.push(n),
    });
    expect(ticks).toEqual([10, 20, 30, 40]);
  });
});
