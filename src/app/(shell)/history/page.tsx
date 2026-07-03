'use client';

import { useMemo, useState } from 'react';
import type { WalletTx } from '@/lib/wallet/history';
import { useTxHistory, useUtxos } from '@/hooks/useWalletData';
import { useActiveWallet } from '@/stores/wallets';
import { BumpFeeDialog } from '@/components/BumpFeeDialog';
import { SpeedUpDialog } from '@/components/SpeedUpDialog';
import { TxList } from '@/components/TxList';
import { PageTitle } from '@/components/ui';

export default function HistoryPage() {
  const wallet = useActiveWallet();
  const history = useTxHistory(wallet);
  const utxos = useUtxos(wallet);
  const [bumping, setBumping] = useState<WalletTx | null>(null);
  const [speedingUp, setSpeedingUp] = useState<WalletTx | null>(null);

  // A pending incoming payment is speed-up-able only while its output to us
  // is still unspent (i.e. present in the UTXO set).
  const anchorTxids = useMemo(
    () => new Set((utxos.data ?? []).filter((u) => !u.confirmed).map((u) => u.txid)),
    [utxos.data],
  );

  if (!wallet) return null;

  const canAct = wallet.type === 'hot';

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
          renderAction={(tx) => {
            if (!canAct) return null;
            if (tx.bumpable) {
              return (
                <ActionPill label="Bump fee" onClick={() => setBumping(tx)} />
              );
            }
            if (tx.direction === 'in' && !tx.confirmed && anchorTxids.has(tx.txid)) {
              return (
                <ActionPill label="Speed up" onClick={() => setSpeedingUp(tx)} />
              );
            }
            return null;
          }}
        />
      )}
      {bumping && <BumpFeeDialog tx={bumping} onClose={() => setBumping(null)} />}
      {speedingUp && <SpeedUpDialog tx={speedingUp} onClose={() => setSpeedingUp(null)} />}
    </div>
  );
}

function ActionPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="mt-1 rounded-full bg-accent-dim px-2.5 py-0.5 text-[11px] font-semibold text-accent transition hover:brightness-125"
    >
      {label}
    </button>
  );
}
