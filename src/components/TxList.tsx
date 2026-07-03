'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Clock } from 'lucide-react';
import type { WalletTx } from '@/lib/wallet/history';
import { timeAgo, truncateMiddle } from '@/lib/format';
import { Amount } from './Amount';

/** Shared transaction list — home (compact), history, and address pages. */
export function TxList({
  txs,
  emptyLabel = 'No transactions yet.',
  renderAction,
}: {
  txs: WalletTx[];
  emptyLabel?: string;
  renderAction?: (tx: WalletTx) => React.ReactNode;
}) {
  if (txs.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-neutral-800/70">
      {txs.map((tx) => (
        <li key={tx.txid}>
          <Link
            href={`/tx/${tx.txid}`}
            className="flex items-center gap-3 py-3 transition hover:bg-neutral-900/40"
          >
            <TxIcon tx={tx} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-100">
                {tx.direction === 'in'
                  ? 'Received'
                  : tx.direction === 'out'
                    ? 'Sent'
                    : 'Moved within wallet'}
                {!tx.confirmed && (
                  <span className="ml-2 rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                    Pending
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {tx.blockTime ? timeAgo(tx.blockTime) : 'in mempool'}
                {tx.counterparty && <> · {truncateMiddle(tx.counterparty, 6)}</>}
              </p>
            </div>
            <div className="text-right">
              <Amount
                sats={tx.netSats}
                signed
                className={`text-sm font-semibold ${
                  tx.netSats > 0n ? 'text-emerald-400' : 'text-neutral-200'
                }`}
              />
              {renderAction?.(tx)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TxIcon({ tx }: { tx: WalletTx }) {
  const Icon = !tx.confirmed
    ? Clock
    : tx.direction === 'in'
      ? ArrowDownLeft
      : tx.direction === 'self'
        ? RefreshCw
        : ArrowUpRight;
  const color = !tx.confirmed
    ? 'text-amber-400 bg-amber-950/50'
    : tx.direction === 'in'
      ? 'text-emerald-400 bg-emerald-950/50'
      : 'text-neutral-300 bg-neutral-800/80';
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
      <Icon size={16} />
    </span>
  );
}
