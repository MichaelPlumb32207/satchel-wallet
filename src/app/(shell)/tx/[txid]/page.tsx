'use client';

import Link from 'next/link';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { getTx } from '@/lib/api/mempool';
import type { Vout } from '@/lib/api/types';
import { timeAgo, truncateMiddle } from '@/lib/format';
import { getNetwork } from '@/lib/networks';
import { useTipHeight, useWatchSet } from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet } from '@/stores/wallets';
import { Amount } from '@/components/Amount';
import { Card, PageTitle } from '@/components/ui';

/** Slim explorer: transaction detail. */
export default function TxPage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = use(params);
  const network = useSettingsStore((s) => s.network);
  const config = getNetwork(network);
  const tip = useTipHeight();
  const wallet = useActiveWallet();
  const watchSet = useWatchSet(wallet);

  const tx = useQuery({
    queryKey: [network, 'tx', txid],
    queryFn: ({ signal }) => getTx(config.apiBase, txid, signal),
    refetchInterval: (query) => (query.state.data?.status.confirmed ? false : 15_000),
  });

  if (tx.isPending) {
    return <div className="mt-6 h-40 animate-pulse rounded-2xl bg-neutral-900" />;
  }
  if (tx.isError || !tx.data) {
    return (
      <p className="py-10 text-center text-sm text-red-400">
        Transaction not found on {config.label}.
      </p>
    );
  }

  const data = tx.data;
  const vsize = Math.ceil(data.weight / 4);
  const feeRate = data.fee > 0 ? (data.fee / vsize).toFixed(1) : null;
  const confirmations =
    data.status.confirmed && data.status.block_height && tip.data
      ? tip.data - data.status.block_height + 1
      : 0;
  const isOurs = (address?: string) => !!address && !!watchSet?.allOurs.has(address);

  return (
    <div>
      <PageTitle subtitle={truncateMiddle(txid, 12)}>Transaction</PageTitle>

      <Card className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label="Status">
          {data.status.confirmed ? (
            <span className="text-emerald-400">
              {confirmations.toLocaleString()} confirmation{confirmations === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-amber-400">Pending in mempool</span>
          )}
        </Field>
        <Field label="Time">
          {data.status.block_time ? timeAgo(data.status.block_time) : '—'}
        </Field>
        <Field label="Fee">
          {data.fee > 0 ? <Amount sats={BigInt(data.fee)} /> : '—'}
        </Field>
        <Field label="Fee rate">{feeRate ? `${feeRate} sat/vB` : '—'}</Field>
        <Field label="Size">{vsize.toLocaleString()} vB</Field>
        <Field label="Block">
          {data.status.block_height ? `#${data.status.block_height.toLocaleString()}` : '—'}
        </Field>
      </Card>

      <IOList title={`Inputs (${data.vin.length})`}>
        {data.vin.map((vin, i) =>
          vin.is_coinbase ? (
            <IORow key={i} label="Coinbase (newly mined)" />
          ) : (
            <IORow
              key={i}
              address={vin.prevout?.scriptpubkey_address}
              sats={vin.prevout ? BigInt(vin.prevout.value) : undefined}
              mine={isOurs(vin.prevout?.scriptpubkey_address)}
            />
          ),
        )}
      </IOList>

      <IOList title={`Outputs (${data.vout.length})`}>
        {data.vout.map((vout: Vout, i: number) => (
          <IORow
            key={i}
            address={vout.scriptpubkey_address}
            label={vout.scriptpubkey_address ? undefined : `${vout.scriptpubkey_type} output`}
            sats={BigInt(vout.value)}
            mine={isOurs(vout.scriptpubkey_address)}
          />
        ))}
      </IOList>

      <a
        href={`${config.explorerBase}/tx/${txid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm text-accent hover:underline"
      >
        View on mempool.space <ExternalLink size={13} />
      </a>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-neutral-200">{children}</p>
    </div>
  );
}

function IOList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">{title}</h2>
      <div className="divide-y divide-neutral-800/70 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4">
        {children}
      </div>
    </section>
  );
}

function IORow({
  address,
  label,
  sats,
  mine = false,
}: {
  address?: string;
  label?: string;
  sats?: bigint;
  mine?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {address ? (
          <Link href={`/address/${address}`} className="text-neutral-300 hover:text-accent">
            {truncateMiddle(address, 10)}
          </Link>
        ) : (
          <span className="text-neutral-500">{label ?? 'Unknown'}</span>
        )}
        {mine && (
          <span className="ml-2 rounded-full bg-accent-dim px-1.5 py-0.5 font-sans text-[10px] font-semibold text-accent">
            yours
          </span>
        )}
      </span>
      {sats !== undefined && <Amount sats={sats} className="shrink-0 text-neutral-200" />}
    </div>
  );
}
