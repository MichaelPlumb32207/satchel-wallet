'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { getAddressInfo, getAddressTxsChain, getAddressTxsMempool } from '@/lib/api/mempool';
import { truncateMiddle } from '@/lib/format';
import { getNetwork } from '@/lib/networks';
import { classifyTxs } from '@/lib/wallet/history';
import { useSettingsStore } from '@/stores/settings';
import { Amount } from '@/components/Amount';
import { TxList } from '@/components/TxList';
import { Card, PageTitle } from '@/components/ui';

/** Slim explorer: any address's balance and activity (not just ours). */
export default function AddressPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = use(params);
  const network = useSettingsStore((s) => s.network);
  const config = getNetwork(network);

  const info = useQuery({
    queryKey: [network, 'addressInfo', addr],
    queryFn: ({ signal }) => getAddressInfo(config.apiBase, addr, signal),
  });

  const txs = useQuery({
    queryKey: [network, 'addressTxs', addr],
    queryFn: async ({ signal }) => {
      const [chain, mempool] = await Promise.all([
        getAddressTxsChain(config.apiBase, addr, undefined, signal),
        getAddressTxsMempool(config.apiBase, addr, signal),
      ]);
      // Classify relative to this address: its incoming/outgoing, not ours.
      return classifyTxs([...mempool, ...chain], new Set([addr]));
    },
  });

  if (info.isError) {
    return (
      <p className="py-10 text-center text-sm text-red-400">
        Address not found on {config.label}.
      </p>
    );
  }

  const stats = info.data;
  const balance = stats
    ? BigInt(
        stats.chain_stats.funded_txo_sum -
          stats.chain_stats.spent_txo_sum +
          stats.mempool_stats.funded_txo_sum -
          stats.mempool_stats.spent_txo_sum,
      )
    : null;

  return (
    <div>
      <PageTitle subtitle={truncateMiddle(addr, 14)}>Address</PageTitle>

      <Card className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-neutral-500">Balance</p>
          <p className="mt-0.5 text-neutral-100">
            {balance !== null ? <Amount sats={balance} /> : '…'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Transactions</p>
          <p className="mt-0.5 text-neutral-100">
            {stats ? stats.chain_stats.tx_count + stats.mempool_stats.tx_count : '…'}
          </p>
        </div>
      </Card>

      <section className="mt-5">
        <h2 className="mb-1 text-sm font-semibold text-neutral-300">Activity</h2>
        {txs.isPending ? (
          <div className="mt-2 space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-neutral-900" />
            <div className="h-12 animate-pulse rounded-xl bg-neutral-900" />
          </div>
        ) : (
          <TxList txs={txs.data ?? []} emptyLabel="No activity for this address." />
        )}
        {(txs.data?.length ?? 0) >= 25 && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Showing the most recent transactions — see mempool.space for the full history.
          </p>
        )}
      </section>

      <a
        href={`${config.explorerBase}/address/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm text-accent hover:underline"
      >
        View on mempool.space <ExternalLink size={13} />
      </a>
    </div>
  );
}
