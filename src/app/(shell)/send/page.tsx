'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { checkAddress } from '@/lib/bitcoin/addresses';
import { parseBip21 } from '@/lib/bitcoin/bip21';
import { deriveAddress } from '@/lib/bitcoin/derivation';
import { btcToSats, formatSats, satsToBtc, satsToFiat } from '@/lib/bitcoin/units';
import { formatFiat, truncateMiddle } from '@/lib/format';
import { getNetwork, NETWORKS } from '@/lib/networks';
import { executeSend, planSend, type SendPlan } from '@/lib/wallet/send';
import {
  useAccountNode,
  useFeeEstimates,
  usePrice,
  useUtxos,
  useWalletScan,
} from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet } from '@/stores/wallets';
import { Amount } from '@/components/Amount';
import { Button, Card, ErrorText, Input, Label, PageTitle } from '@/components/ui';

const QrScanDialog = dynamic(() => import('@/components/QrScanner'), { ssr: false });

type Step = 'recipient' | 'amount' | 'confirm' | 'success';
type FeePreset = 'fast' | 'normal' | 'slow' | 'custom';

export default function SendPage() {
  const wallet = useActiveWallet();
  const network = useSettingsStore((s) => s.network);
  const unit = useSettingsStore((s) => s.unit);
  const currency = useSettingsStore((s) => s.currency);
  const config = getNetwork(network);
  const account = useAccountNode(wallet);
  const scan = useWalletScan(wallet);
  const utxos = useUtxos(wallet);
  const fees = useFeeEstimates();
  const price = usePrice();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('recipient');
  const [recipient, setRecipient] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isMax, setIsMax] = useState(false);
  const [preset, setPreset] = useState<FeePreset>('normal');
  const [customRate, setCustomRate] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const addressCheck = useMemo(
    () => (recipient ? checkAddress(recipient, network) : null),
    [recipient, network],
  );

  const feeRate = useMemo(() => {
    if (preset === 'custom') return parseFloat(customRate) || 0;
    if (!fees.data) return 0;
    return { fast: fees.data.fastestFee, normal: fees.data.halfHourFee, slow: fees.data.hourFee }[
      preset
    ];
  }, [preset, customRate, fees.data]);

  const amountSats = useMemo(() => {
    if (isMax) return 'max' as const;
    try {
      if (unit === 'sats') {
        if (!/^\d+$/.test(amountInput.trim())) return null;
        return BigInt(amountInput.trim());
      }
      return btcToSats(amountInput);
    } catch {
      return null;
    }
  }, [amountInput, isMax, unit]);

  const planResult = useMemo(() => {
    if (
      !wallet ||
      !account ||
      !scan.data ||
      !utxos.data ||
      !addressCheck?.ok ||
      amountSats === null ||
      feeRate <= 0
    ) {
      return null;
    }
    return planSend({
      utxos: utxos.data,
      account,
      scriptType: wallet.scriptType,
      networkId: network,
      recipient,
      amount: amountSats,
      feeRate,
      changeAddress: deriveAddress(
        account,
        wallet.scriptType,
        network,
        1,
        scan.data.change.nextIndex,
      ),
    });
  }, [wallet, account, scan.data, utxos.data, addressCheck, amountSats, feeRate, recipient, network]);

  if (!wallet) return null;

  if (wallet.type === 'watch') {
    return (
      <div>
        <PageTitle>Send</PageTitle>
        <Card>
          <p className="text-sm text-neutral-300">
            This is a watch-only wallet — it has no keys, so it can&apos;t send. Import its seed
            phrase as a hot wallet to spend from it.
          </p>
        </Card>
      </div>
    );
  }

  function handleRecipientInput(value: string) {
    setSendError(null);
    const bip21 = value.toLowerCase().startsWith('bitcoin:')
      ? (() => {
          try {
            return parseBip21(value);
          } catch (err) {
            setSendError((err as Error).message);
            return null;
          }
        })()
      : null;
    if (bip21) {
      setRecipient(bip21.address);
      if (bip21.amountSats) {
        setAmountInput(unit === 'sats' ? bip21.amountSats.toString() : satsToBtc(bip21.amountSats));
        setIsMax(false);
      }
    } else {
      setRecipient(value.trim());
    }
  }

  async function handleSend(plan: SendPlan) {
    setBusy(true);
    setSendError(null);
    try {
      const id = await executeSend(plan, wallet!.id, wallet!.scriptType, network);
      setTxid(id);
      setStep('success');
      void queryClient.invalidateQueries({ queryKey: [network, 'utxos'] });
      void queryClient.invalidateQueries({ queryKey: [network, 'history'] });
      void queryClient.invalidateQueries({ queryKey: [network, 'scan'] });
    } catch (err) {
      setSendError(
        err instanceof Error && err.message.includes('failed')
          ? 'Broadcast failed — the network rejected the transaction.'
          : (err as Error).message || 'Something went wrong.',
      );
    } finally {
      setBusy(false);
    }
  }

  const balance = utxos.data?.reduce((sum, u) => sum + u.value, 0n) ?? null;

  return (
    <div>
      <PageTitle subtitle={`Pay any Bitcoin address on ${config.label}.`}>Send</PageTitle>

      {step === 'recipient' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (addressCheck?.ok) setStep('amount');
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label>Recipient</Label>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={recipient}
                onChange={(e) => handleRecipientInput(e.target.value)}
                placeholder="bc1q… address or bitcoin: link"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setScanning(true)}
                aria-label="Scan QR code"
                className="shrink-0 rounded-xl border border-neutral-700 px-3 text-neutral-300 transition hover:border-neutral-500"
              >
                <ScanLine size={18} />
              </button>
            </div>
            <div className="mt-1.5 text-xs">
              {addressCheck?.ok && (
                <span className="text-emerald-400">✓ Valid {addressCheck.type} address</span>
              )}
              {addressCheck && !addressCheck.ok && addressCheck.reason === 'wrong-network' && (
                <span className="text-red-400">
                  This is a {NETWORKS[addressCheck.detected].label} address, but you&apos;re on{' '}
                  {config.label}.
                </span>
              )}
              {addressCheck && !addressCheck.ok && addressCheck.reason === 'invalid' && (
                <span className="text-red-400">Not a valid Bitcoin address.</span>
              )}
            </div>
          </div>
          <ErrorText>{sendError}</ErrorText>
          <Button type="submit" disabled={!addressCheck?.ok}>
            Continue
          </Button>
        </form>
      )}

      {step === 'amount' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (planResult?.ok) setStep('confirm');
          }}
          className="flex flex-col gap-4"
        >
          <p className="font-mono text-xs text-neutral-500">
            To {truncateMiddle(recipient, 10)}{' '}
            <button type="button" className="text-accent" onClick={() => setStep('recipient')}>
              edit
            </button>
          </p>

          <div>
            <div className="flex items-baseline justify-between">
              <Label>Amount</Label>
              {balance !== null && (
                <span className="text-xs text-neutral-500">
                  Balance: {unit === 'sats' ? `${formatSats(balance)} sats` : `${satsToBtc(balance)} ${config.unit}`}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                inputMode="decimal"
                value={isMax && planResult?.ok ? (unit === 'sats' ? planResult.plan.amount.toString() : satsToBtc(planResult.plan.amount)) : amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setIsMax(false);
                }}
                placeholder={unit === 'sats' ? '50000' : '0.0005'}
                disabled={isMax}
                autoFocus
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500">
                  {unit === 'sats' ? 'sats' : config.unit}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMax(!isMax)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                    isMax ? 'bg-accent text-accent-contrast' : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  MAX
                </button>
              </div>
            </div>
            {!config.isPractice && price !== null && amountSats !== null && amountSats !== 'max' && amountSats > 0n && (
              <p className="mt-1 text-xs text-neutral-500">
                ≈ {formatFiat(satsToFiat(amountSats, price), currency)}
              </p>
            )}
          </div>

          <div>
            <Label>Network fee</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'fast', label: 'Fast', eta: '~10 min', rate: fees.data?.fastestFee },
                  { key: 'normal', label: 'Normal', eta: '~30 min', rate: fees.data?.halfHourFee },
                  { key: 'slow', label: 'Slow', eta: '~1 hour', rate: fees.data?.hourFee },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPreset(option.key)}
                  className={`rounded-xl border px-2 py-2.5 text-center transition ${
                    preset === option.key
                      ? 'border-accent bg-accent-dim'
                      : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-[11px] text-neutral-500">{option.eta}</span>
                  <span className="block text-[11px] text-neutral-400">
                    {option.rate ?? '…'} sat/vB
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`mt-2 text-xs underline-offset-4 hover:underline ${preset === 'custom' ? 'text-accent' : 'text-neutral-500'}`}
            >
              Custom rate
            </button>
            {preset === 'custom' && (
              <div className="relative mt-2">
                <Input
                  inputMode="decimal"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="4.2"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  sat/vB
                </span>
              </div>
            )}
          </div>

          {planResult?.ok && (
            <p className="text-xs text-neutral-400">
              Fee: <Amount sats={planResult.plan.fee} showFiat /> · {planResult.plan.vsize} vB
            </p>
          )}
          {planResult && !planResult.ok && amountSats !== null && (
            <p className="text-xs text-red-400">
              {planResult.error}
              {planResult.missing !== undefined && (
                <> (short {formatSats(planResult.missing)} sats)</>
              )}
            </p>
          )}

          <Button type="submit" disabled={!planResult?.ok}>
            Review
          </Button>
        </form>
      )}

      {step === 'confirm' && planResult?.ok && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 text-sm">
            <Row label="To">
              <span className="break-all font-mono text-xs">{chunk(recipient)}</span>
            </Row>
            <Row label="Amount">
              <Amount sats={planResult.plan.amount} showFiat />
            </Row>
            <Row label="Network fee">
              <Amount sats={planResult.plan.fee} showFiat />
              <span className="ml-1 text-neutral-500">({feeRate} sat/vB)</span>
            </Row>
            <div className="border-t border-neutral-800 pt-3">
              <Row label="Total">
                <Amount
                  sats={planResult.plan.amount + planResult.plan.fee}
                  showFiat
                  className="font-semibold"
                />
              </Row>
            </div>
          </Card>

          {config.isPractice && (
            <p className="text-xs text-accent-strong">
              Practice mode — these are free testnet coins, experiment away.
            </p>
          )}
          <ErrorText>{sendError}</ErrorText>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('amount')}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => handleSend(planResult.plan)}
            >
              {busy ? 'Sending…' : 'Send now'}
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && txid && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 size={44} className="text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight">Payment sent</h2>
          <p className="max-w-xs text-sm text-neutral-400">
            Your transaction is in the mempool. It&apos;ll show as pending until miners confirm
            it — you can bump the fee from History if it gets stuck.
          </p>
          <Link href={`/tx/${txid}`} className="text-sm text-accent hover:underline">
            View transaction
          </Link>
          <Link
            href="/"
            className="w-full max-w-xs rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast"
          >
            Done
          </Link>
        </div>
      )}

      {scanning && (
        <QrScanDialog
          onScan={(data) => {
            setScanning(false);
            handleRecipientInput(data);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Space an address into readable groups of 4. */
function chunk(address: string): string {
  return address.replace(/(.{4})/g, '$1 ').trim();
}
