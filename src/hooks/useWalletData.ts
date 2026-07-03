'use client';

import { useQuery } from '@tanstack/react-query';
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
import type { DerivedAddress } from '@/lib/bitcoin/derivation';
import type { Chain } from '@/lib/bitcoin/types';
import { getNetwork } from '@/lib/networks';
import { resolveAccount } from '@/lib/wallet/account';
import { classifyTxs, type WalletTx } from '@/lib/wallet/history';
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
    // A scan is expensive (one request per address probed) — run it once per
    // session/network and keep it. New activity on watched addresses is seen
    // by the cheap utxo/history polls; anything that changes the address set
    // (receive rotation, a send) invalidates this key explicitly.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
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

export interface Balance {
  confirmed: bigint;
  pending: bigint;
  total: bigint;
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
