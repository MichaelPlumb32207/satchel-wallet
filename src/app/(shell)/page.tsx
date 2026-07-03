'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useActiveWallet } from '@/stores/wallets';
import { Card } from '@/components/ui';

/**
 * Home dashboard. M3 placeholder — M4 adds balance, fiat, and recent
 * activity on top of the scan/UTXO hooks.
 */
export default function HomePage() {
  const wallet = useActiveWallet();
  if (!wallet) return null;

  return (
    <div>
      <Card className="mt-2 flex flex-col items-center gap-1 py-8">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{wallet.name}</p>
        <p className="text-3xl font-bold tracking-tight">—</p>
        <p className="text-xs text-neutral-500">Balance appears once the dashboard lands (M4)</p>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/send"
          className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
        >
          <ArrowUpFromLine size={17} /> Send
        </Link>
        <Link
          href="/receive"
          className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 px-4 py-4 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500"
        >
          <ArrowDownToLine size={17} /> Receive
        </Link>
      </div>
    </div>
  );
}
