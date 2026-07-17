'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, Eye } from 'lucide-react';
import { satsToFiat } from '@/lib/bitcoin/units';
import { formatFiat } from '@/lib/format';
import { getNetwork } from '@/lib/networks';
import {
  useBalance,
  usePrice,
  useScanProgress,
  useTxHistory,
  useWalletScan,
} from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet } from '@/stores/wallets';
import { Amount, BalanceFigure } from '@/components/Amount';
import { TxList } from '@/components/TxList';
import { Button, Card } from '@/components/ui';

export default function HomePage() {
  const wallet = useActiveWallet();
  const network = useSettingsStore((s) => s.network);
  const currency = useSettingsStore((s) => s.currency);
  const config = getNetwork(network);
  const scan = useWalletScan(wallet);
  const progress = useScanProgress(wallet);
  const balance = useBalance(wallet);
  const history = useTxHistory(wallet);
  const price = usePrice();

  if (!wallet) return null;

  if (wallet.type === 'watch' && wallet.watchNetwork !== network) {
    return <WrongNetwork expected={wallet.watchNetwork} />;
  }

  const recent = history.data?.slice(0, 5) ?? [];
  const scanning = scan.isPending || scan.isFetching;
  const provisional = progress.data?.provisional ?? null;
  // Prefer the authoritative UTXO sum; fall back to scan-so-far (kept after
  // the scan finishes so we don't flash empty while UTXOs load).
  const displayBalance = balance ?? provisional;
  const showingProvisional = !balance && !!provisional;

  return (
    <div>
      <Card className="mt-2 flex flex-col items-center gap-1.5 py-8">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-500">
          {wallet.type === 'watch' && <Eye size={12} />}
          {wallet.name}
        </p>

        {displayBalance ? (
          <>
            <BalanceFigure sats={displayBalance.total} />
            {!config.isPractice && price !== null && (
              <p className="text-sm text-neutral-500">
                ≈ {formatFiat(satsToFiat(displayBalance.total, price), currency)}
              </p>
            )}
            {displayBalance.pending !== 0n && (
              <p className="mt-1 rounded-full bg-amber-950/60 px-3 py-1 text-xs text-amber-400">
                <Amount sats={displayBalance.pending} signed /> pending confirmation
              </p>
            )}
            {showingProvisional && (
              <p className="mt-2 max-w-xs text-center text-xs text-neutral-500">
                Balance so far
                {progress.data
                  ? ` · ${progress.data.checked} address${progress.data.checked === 1 ? '' : 'es'} checked`
                  : ''}
                . Still looking for more…
              </p>
            )}
          </>
        ) : scan.isError || (scan.isFetched && !scan.data && !scanning) ? (
          <p className="py-3 text-sm text-red-400">Couldn&apos;t reach the network.</p>
        ) : scanning ? (
          <ScanStatus
            checked={progress.data?.checked ?? 0}
            usedFound={progress.data?.usedFound ?? 0}
          />
        ) : (
          <div className="my-3 h-9 w-44 animate-pulse rounded-lg bg-neutral-800" />
        )}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {wallet.type === 'hot' ? (
          <Link
            href="/send"
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
          >
            <ArrowUpFromLine size={17} /> Send
          </Link>
        ) : (
          <div
            title="Watch-only wallets can't spend"
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-neutral-800/60 px-4 py-4 text-sm font-semibold text-neutral-500"
          >
            <ArrowUpFromLine size={17} /> Send
          </div>
        )}
        <Link
          href="/receive"
          className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 px-4 py-4 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500"
        >
          <ArrowDownToLine size={17} /> Receive
        </Link>
      </div>

      <section className="mt-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">Recent activity</h2>
          {recent.length > 0 && (
            <Link href="/history" className="text-xs text-accent hover:underline">
              See all
            </Link>
          )}
        </div>
        {history.isPending && !history.data ? (
          <div className="space-y-2 py-2">
            <div className="h-12 animate-pulse rounded-xl bg-neutral-900" />
            <div className="h-12 animate-pulse rounded-xl bg-neutral-900" />
          </div>
        ) : (
          <TxList
            txs={recent}
            emptyLabel={
              scanning
                ? 'Looking up past activity…'
                : config.isPractice
                  ? 'Nothing yet — grab some practice coins from a faucet and send yourself a payment.'
                  : 'Nothing yet — receive your first sats to get started.'
            }
          />
        )}
      </section>
    </div>
  );
}

/** Reassuring copy while the gap-limit scan is still probing addresses. */
function ScanStatus({ checked, usedFound }: { checked: number; usedFound: number }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-1 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-accent" />
      <p className="text-sm text-neutral-300">Looking for your coins…</p>
      <p className="max-w-xs text-xs text-neutral-500">
        Satchel checks past addresses one by one. A blank screen doesn&apos;t mean
        they&apos;re gone — this can take a minute on a busy network.
      </p>
      <p className="text-xs tabular-nums text-neutral-500">
        {checked} address{checked === 1 ? '' : 'es'} checked
        {usedFound > 0
          ? ` · activity on ${usedFound}`
          : ''}
      </p>
    </div>
  );
}

function WrongNetwork({ expected }: { expected?: 'mainnet' | 'testnet4' }) {
  const setNetwork = useSettingsStore((s) => s.setNetwork);
  if (!expected) return null;
  return (
    <Card className="mt-6 flex flex-col gap-3">
      <p className="text-sm text-neutral-300">
        This watch-only wallet lives on {getNetwork(expected).label}.
      </p>
      <Button onClick={() => setNetwork(expected)}>Switch to {getNetwork(expected).label}</Button>
    </Card>
  );
}
