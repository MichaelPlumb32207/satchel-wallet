'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getTx } from '@/lib/api/mempool';
import type { WalletTx } from '@/lib/wallet/history';
import { planCpfp, type CpfpResult } from '@/lib/wallet/cpfp';
import { executeSend } from '@/lib/wallet/send';
import { getNetwork } from '@/lib/networks';
import {
  useAccountNode,
  useFeeEstimates,
  useUtxos,
  useWalletScan,
} from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet } from '@/stores/wallets';
import { Amount } from './Amount';
import { Button, ErrorText, Input, Label } from './ui';

/**
 * CPFP "speed up" for a pending payment someone sent us: attach a small
 * self-payment whose fee pulls the whole package into the next blocks.
 * The jargon (CPFP, child, package) stays out of the UI on purpose.
 */
export function SpeedUpDialog({ tx, onClose }: { tx: WalletTx; onClose: () => void }) {
  const wallet = useActiveWallet();
  const network = useSettingsStore((s) => s.network);
  const account = useAccountNode(wallet);
  const scan = useWalletScan(wallet);
  const utxos = useUtxos(wallet);
  const fees = useFeeEstimates();
  const queryClient = useQueryClient();

  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CpfpResult | null>(null);

  const suggested = fees.data?.fastestFee ?? null;
  const effectiveRate = rate ? parseFloat(rate) : (suggested ?? 0);

  const ourAddresses = useMemo(() => {
    if (!scan.data) return null;
    return new Map(
      [...scan.data.receive.addresses, ...scan.data.change.addresses].map((a) => [a.address, a]),
    );
  }, [scan.data]);

  async function handlePreview() {
    if (!wallet || !account || !ourAddresses || !utxos.data || effectiveRate <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const parent = await getTx(getNetwork(network).apiBase, tx.txid);
      const cpfp = planCpfp({
        parent,
        networkId: network,
        scriptType: wallet.scriptType,
        account,
        ourAddresses,
        utxos: utxos.data,
        targetRate: effectiveRate,
      });
      if (!cpfp.ok) setError(cpfp.error);
      else setResult(cpfp);
    } catch {
      setError('Could not load the transaction.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBroadcast() {
    if (!wallet || !result?.ok) return;
    setBusy(true);
    setError(null);
    try {
      await executeSend(result.plan, wallet.id, wallet.scriptType, network);
      void queryClient.invalidateQueries({ queryKey: [network, 'utxos'] });
      void queryClient.invalidateQueries({ queryKey: [network, 'history'] });
      onClose();
    } catch {
      setError('Broadcast failed — the payment may have just confirmed. Check and retry.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-neutral-950 p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Speed up this payment</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-900">
            <X size={18} />
          </button>
        </div>

        {!result?.ok ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-400">
              This payment is waiting in line because its sender chose a low fee. You can add a
              small extra fee from your side — miners then confirm the whole thing sooner.
            </p>
            <div>
              <Label>Target fee rate (sat/vB)</Label>
              <Input
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={suggested ? `${suggested} (current fast rate)` : '…'}
                autoFocus
              />
            </div>
            <ErrorText>{error}</ErrorText>
            <Button onClick={handlePreview} disabled={busy || effectiveRate <= 0}>
              {busy ? 'Preparing…' : 'Preview speed-up'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-neutral-800 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Fee rate</span>
                <span>
                  {result.parentFeeRate.toFixed(1)} → {result.packageFeeRate.toFixed(1)} sat/vB
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-neutral-500">Boost cost (paid by you)</span>
                <Amount sats={result.plan.fee} showFiat />
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              The boost moves the coins to another address of yours. If the sender cancels or
              replaces their payment before it confirms, the boost becomes void too — you
              won&apos;t lose anything.
            </p>
            <ErrorText>{error}</ErrorText>
            <Button onClick={handleBroadcast} disabled={busy}>
              {busy ? 'Broadcasting…' : 'Broadcast speed-up'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
