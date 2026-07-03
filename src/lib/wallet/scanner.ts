import type { HDKey } from '@scure/bip32';
import { deriveAddressRange, type DerivedAddress } from '@/lib/bitcoin/derivation';
import type { Chain, ScriptType } from '@/lib/bitcoin/types';
import type { NetworkId } from '@/lib/networks';

export const GAP_LIMIT = 20;
const BATCH_SIZE = 10;

export interface ChainScan {
  /** Every address derived during the scan (index 0 .. lastChecked). */
  addresses: DerivedAddress[];
  usedIndices: number[];
  /** First never-used index — where the receive screen starts. */
  nextIndex: number;
}

export interface ScanResult {
  receive: ChainScan;
  change: ChainScan;
  /** All addresses that have ever been used (the set to query balances for). */
  usedAddresses: DerivedAddress[];
}

export interface ScanOptions {
  /** Injected so the scanner is unit-testable and API-agnostic. */
  isUsed: (address: string) => Promise<boolean>;
  onProgress?: (checkedCount: number) => void;
  gapLimit?: number;
}

/**
 * BIP44 gap-limit scan of one chain: keep deriving batches until `gapLimit`
 * consecutive unused addresses follow the last used one.
 */
async function scanChain(
  account: HDKey,
  scriptType: ScriptType,
  networkId: NetworkId,
  chain: Chain,
  { isUsed, onProgress, gapLimit = GAP_LIMIT }: ScanOptions,
  progressBase: number,
): Promise<ChainScan> {
  const addresses: DerivedAddress[] = [];
  const usedIndices: number[] = [];
  let lastUsed = -1;
  let checked = 0;

  while (checked - (lastUsed + 1) < gapLimit) {
    const batch = deriveAddressRange(account, scriptType, networkId, chain, checked, BATCH_SIZE);
    addresses.push(...batch);
    const results = await Promise.all(batch.map((a) => isUsed(a.address)));
    for (let i = 0; i < batch.length; i++) {
      if (results[i]) {
        usedIndices.push(batch[i].index);
        lastUsed = Math.max(lastUsed, batch[i].index);
      }
    }
    checked += batch.length;
    onProgress?.(progressBase + checked);
  }

  return { addresses, usedIndices, nextIndex: lastUsed + 1 };
}

/** Scan both chains (external/receive and internal/change) of an account. */
export async function scanAccount(
  account: HDKey,
  scriptType: ScriptType,
  networkId: NetworkId,
  options: ScanOptions,
): Promise<ScanResult> {
  const receive = await scanChain(account, scriptType, networkId, 0, options, 0);
  const change = await scanChain(
    account,
    scriptType,
    networkId,
    1,
    options,
    receive.addresses.length,
  );
  return {
    receive,
    change,
    usedAddresses: [
      ...receive.addresses.filter((a) => receive.usedIndices.includes(a.index)),
      ...change.addresses.filter((a) => change.usedIndices.includes(a.index)),
    ],
  };
}
