'use client';

import { useQuery } from '@tanstack/react-query';
import type { HDKey } from '@scure/bip32';
import { useMemo } from 'react';
import { getAddressInfo } from '@/lib/api/mempool';
import { getNetwork } from '@/lib/networks';
import { resolveAccount } from '@/lib/wallet/account';
import { scanAccount, type ScanResult } from '@/lib/wallet/scanner';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import type { WalletMeta } from '@/stores/wallets';

/**
 * Account node for the active network. Re-resolves when the keyring
 * unlocks — the node itself never enters React state beyond this memo.
 */
export function useAccountNode(wallet: WalletMeta | null): HDKey | null {
  const network = useSettingsStore((s) => s.network);
  const unlocked = useSessionStore((s) => s.status === 'unlocked');
  return useMemo(
    () => (wallet && (wallet.type === 'watch' || unlocked) ? resolveAccount(wallet, network) : null),
    [wallet, network, unlocked],
  );
}

/**
 * Gap-limit scan of the wallet's two chains. This is the source of truth
 * for "which addresses are ours" — balance/history/UTXO hooks build on it.
 * Query keys are namespaced by network, so switching networks swaps caches.
 */
export function useWalletScan(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  const account = useAccountNode(wallet);
  const apiBase = getNetwork(network).apiBase;

  return useQuery<ScanResult>({
    queryKey: [network, 'scan', wallet?.id],
    enabled: !!wallet && !!account,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      return scanAccount(account!, wallet!.scriptType, network, {
        isUsed: async (address) => {
          const info = await getAddressInfo(apiBase, address, signal);
          return info.chain_stats.tx_count + info.mempool_stats.tx_count > 0;
        },
      });
    },
  });
}
