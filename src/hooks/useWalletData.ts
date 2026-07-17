'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { HDKey } from '@scure/bip32';
import { useMemo } from 'react';
import {
  getAddressInfo,
  getAddressTxsChain,
  getAddressTxsMempool,
  getAddressUtxos,
  getPrices,
  getRecommendedFees,
  getTipHeight,
} from '@/lib/api/mempool';
import type { AddressInfo } from '@/lib/api/types';
import type { DerivedAddress } from '@/lib/bitcoin/derivation';
import type { Chain } from '@/lib/bitcoin/types';
import { getNetwork } from '@/lib/networks';
import { resolveAccount } from '@/lib/wallet/account';
import { classifyTxs, type WalletTx } from '@/lib/wallet/history';
import { scanAccount, type ScanResult } from '@/lib/wallet/scanner';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import type { WalletMeta } from '@/stores/wallets';

export interface Balance {
  confirmed: bigint;
  pending: bigint;
  total: bigint;
}

/** Confirmed + mempool balance implied by a mempool.space address-info payload. */
export function balanceFromAddressInfo(info: AddressInfo): Balance {
  const confirmed = BigInt(
    info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum,
  );
  const pending = BigInt(
    info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum,
  );
  return { confirmed, pending, total: confirmed + pending };
}

/** Live progress while a gap-limit scan is running (published via setQueryData). */
export interface ScanProgress {
  checked: number;
  usedFound: number;
  /** Running total from address-info on used addresses found so far. */
  provisional: Balance | null;
}

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
 *
 * While the scan runs, publishes live progress under
 * `[network, 'scanProgress', walletId]` so the UI can show address-count
 * progress and a provisional "balance so far" without waiting for the full
 * gap (mainnet cold scans can take tens of seconds on the public API).
 */
export function useWalletScan(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  const account = useAccountNode(wallet);
  const apiBase = getNetwork(network).apiBase;
  const queryClient = useQueryClient();

  return useQuery<ScanResult>({
    queryKey: [network, 'scan', wallet?.id],
    enabled: !!wallet && !!account,
    // A scan is expensive (one request per address probed) — run it once per
    // session/network and keep it. New activity on watched addresses is seen
    // by the cheap utxo/history polls; anything that changes the address set
    // (receive rotation, a send) invalidates this key explicitly.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async ({ signal }) => {
      const progressKey = [network, 'scanProgress', wallet!.id] as const;
      let checked = 0;
      let usedFound = 0;
      let conf = 0n;
      let pend = 0n;

      const publish = () => {
        queryClient.setQueryData<ScanProgress>(progressKey, {
          checked,
          usedFound,
          provisional:
            usedFound > 0
              ? { confirmed: conf, pending: pend, total: conf + pend }
              : null,
        });
      };
      // Reset any leftover progress from a prior scan of this wallet.
      publish();

      return scanAccount(account!, wallet!.scriptType, network, {
        isUsed: async (address) => {
          const info = await getAddressInfo(apiBase, address, signal);
          checked++;
          const used =
            info.chain_stats.tx_count + info.mempool_stats.tx_count > 0;
          if (used) {
            usedFound++;
            const b = balanceFromAddressInfo(info);
            conf += b.confirmed;
            pend += b.pending;
          }
          publish();
          return used;
        },
      });
      // Progress is left in the cache until the next scan so the home screen
      // can keep showing "balance so far" while UTXOs load after the scan.
    },
  });
}

/** Live scan progress (null when idle / cached / finished). */
export function useScanProgress(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  return useQuery<ScanProgress | null>({
    queryKey: [network, 'scanProgress', wallet?.id],
    // Never fetched — only written by useWalletScan via setQueryData.
    enabled: false,
    staleTime: Infinity,
    initialData: null,
    // Keep the type honest when nothing has been written yet.
    queryFn: async () => null,
  });
}

/**
 * The bounded set of addresses to poll: every used address plus a small
 * live window (next few receive slots incl. manual rotations, next change
 * slot). The 60 s scan promotes newly used addresses into the set — this
 * keeps steady-state polling light on the free public API.
 */
export function useWatchSet(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  const scan = useWalletScan(wallet);
  const floor = wallet?.receiveIndexFloor?.[network] ?? 0;

  return useMemo(() => {
    if (!scan.data) return null;
    const { receive, change } = scan.data;
    const windowEnd = Math.max(receive.nextIndex + 2, floor);
    const live = [
      ...receive.addresses.filter((a) => a.index >= receive.nextIndex && a.index <= windowEnd),
      ...change.addresses.filter((a) => a.index === change.nextIndex),
    ];
    const watched = [...scan.data.usedAddresses, ...live];
    const byAddress = new Map(watched.map((a) => [a.address, a]));
    const allOurs = new Set(
      [...receive.addresses, ...change.addresses].map((a) => a.address),
    );
    return { watched, byAddress, allOurs };
  }, [scan.data, floor]);
}

/** A spendable coin with everything the send flow needs to sign it. */
export interface OwnedUtxo {
  txid: string;
  vout: number;
  value: bigint;
  scriptType: WalletMeta['scriptType'];
  address: string;
  chain: Chain;
  index: number;
  confirmed: boolean;
}

export function useUtxos(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  const apiBase = getNetwork(network).apiBase;
  const watchSet = useWatchSet(wallet);

  return useQuery<OwnedUtxo[]>({
    queryKey: [network, 'utxos', wallet?.id, watchSet?.watched.length],
    enabled: !!wallet && !!watchSet,
    // Big wallets watch many addresses — poll them gently.
    refetchInterval: (watchSet?.watched.length ?? 0) > 15 ? 120_000 : 30_000,
    queryFn: async ({ signal }) => {
      const results = await Promise.all(
        watchSet!.watched.map(async (addr: DerivedAddress) => {
          const utxos = await getAddressUtxos(apiBase, addr.address, signal);
          return utxos.map((u) => ({
            txid: u.txid,
            vout: u.vout,
            value: BigInt(u.value),
            scriptType: wallet!.scriptType,
            address: addr.address,
            chain: addr.chain,
            index: addr.index,
            confirmed: u.status.confirmed,
          }));
        }),
      );
      return results.flat();
    },
  });
}

export function useBalance(wallet: WalletMeta | null): Balance | null {
  const utxos = useUtxos(wallet);
  return useMemo(() => {
    if (!utxos.data) return null;
    let confirmed = 0n;
    let pending = 0n;
    for (const u of utxos.data) {
      if (u.confirmed) confirmed += u.value;
      else pending += u.value;
    }
    return { confirmed, pending, total: confirmed + pending };
  }, [utxos.data]);
}

export function useTxHistory(wallet: WalletMeta | null) {
  const network = useSettingsStore((s) => s.network);
  const apiBase = getNetwork(network).apiBase;
  const watchSet = useWatchSet(wallet);

  return useQuery<WalletTx[]>({
    queryKey: [network, 'history', wallet?.id, watchSet?.watched.length],
    enabled: !!wallet && !!watchSet,
    refetchInterval: (watchSet?.watched.length ?? 0) > 15 ? 120_000 : 30_000,
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        watchSet!.watched.flatMap((addr: DerivedAddress) => [
          getAddressTxsChain(apiBase, addr.address, undefined, signal),
          getAddressTxsMempool(apiBase, addr.address, signal),
        ]),
      );
      return classifyTxs(pages.flat(), watchSet!.allOurs);
    },
  });
}

/** Spot price in the user's display currency. Prices are network-independent. */
export function usePrice(): number | null {
  const currency = useSettingsStore((s) => s.currency);
  const query = useQuery({
    queryKey: ['price'],
    queryFn: ({ signal }) => getPrices(signal),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
  return query.data?.[currency] ?? null;
}

export function useFeeEstimates() {
  const network = useSettingsStore((s) => s.network);
  const apiBase = getNetwork(network).apiBase;
  return useQuery({
    queryKey: [network, 'fees'],
    queryFn: ({ signal }) => getRecommendedFees(apiBase, signal),
    refetchInterval: 30_000,
  });
}

export function useTipHeight() {
  const network = useSettingsStore((s) => s.network);
  const apiBase = getNetwork(network).apiBase;
  return useQuery({
    queryKey: [network, 'tip'],
    queryFn: ({ signal }) => getTipHeight(apiBase, signal),
    refetchInterval: 30_000,
  });
}
