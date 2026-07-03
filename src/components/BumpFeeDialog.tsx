'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { WalletTx } from '@/lib/wallet/history';
import { planBump, type BumpResult } from '@/lib/wallet/bump';
import { executeSend } from '@/lib/wallet/send';
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

/** RBF fee bump: replace a stuck unconfirmed send with a higher-fee version. */
export function BumpFeeDialog({ tx, onClose }: { tx: WalletTx; onClose: () => void }) {
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
  const [result, setResult] = useState<BumpResult | null>(null);

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
      const bump = await planBump({
        txid: tx.txid,
        networkId: network,
        scriptType: wallet.scriptType,
        account,
        ourAddresses,
        utxos: utxos.data,
        newFeeRate: effectiveRate,
      });
      if (!bump.ok) setError(bump.error);
      else setResult(bump);
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
      setError('Broadcast failed — the replacement may not meet RBF rules.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-neutral-950 p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Bump fee</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-900">
            <X size={18} />
          </button>
        </div>

        {!result?.ok ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-400">
              Rebroadcast this payment with a higher fee so miners pick it up sooner. The
              recipient still gets exactly the same amount.
            </p>
            <div>
              <Label>New fee rate (sat/vB)</Label>
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
              {busy ? 'Preparing…' : 'Preview bump'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-neutral-800 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Fee rate</span>
                <span>
                  {result.originalFeeRate.toFixed(1)} → {result.newFeeRate} sat/vB
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-neutral-500">New fee</span>
                <Amount sats={result.plan.fee} showFiat />
              </div>
            </div>
            <ErrorText>{error}</ErrorText>
            <Button onClick={handleBroadcast} disabled={busy}>
              {busy ? 'Broadcasting…' : 'Broadcast replacement'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
