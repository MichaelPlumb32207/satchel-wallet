'use client';

import { useState } from 'react';
import type { WalletTx } from '@/lib/wallet/history';
import { useTxHistory } from '@/hooks/useWalletData';
import { useActiveWallet } from '@/stores/wallets';
import { BumpFeeDialog } from '@/components/BumpFeeDialog';
import { TxList } from '@/components/TxList';
import { PageTitle } from '@/components/ui';

export default function HistoryPage() {
  const wallet = useActiveWallet();
  const history = useTxHistory(wallet);
  const [bumping, setBumping] = useState<WalletTx | null>(null);

  if (!wallet) return null;

  return (
    <div>
      <PageTitle subtitle="Every payment in and out of this wallet.">History</PageTitle>
      {history.isPending && !history.data ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-900" />
          ))}
        </div>
      ) : history.isError ? (
        <p className="py-6 text-center text-sm text-red-400">
          Couldn&apos;t load history — check your connection.
        </p>
      ) : (
        <TxList
          txs={history.data ?? []}
          renderAction={(tx) =>
            tx.bumpable && wallet.type === 'hot' ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBumping(tx);
                }}
                className="mt-1 rounded-full bg-accent-dim px-2.5 py-0.5 text-[11px] font-semibold text-accent transition hover:brightness-125"
              >
                Bump fee
              </button>
            ) : null
          }
        />
      )}
      {bumping && <BumpFeeDialog tx={bumping} onClose={() => setBumping(null)} />}
    </div>
  );
}
