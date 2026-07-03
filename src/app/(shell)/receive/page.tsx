'use client';

import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Plus } from 'lucide-react';
import { buildBip21 } from '@/lib/bitcoin/bip21';
import { deriveAddress } from '@/lib/bitcoin/derivation';
import { btcToSats } from '@/lib/bitcoin/units';
import { getNetwork } from '@/lib/networks';
import { GAP_LIMIT } from '@/lib/wallet/scanner';
import { useAccountNode, useUtxos, useWalletScan } from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet, useWalletsStore } from '@/stores/wallets';
import { Button, Card, Input, Label, PageTitle } from '@/components/ui';

export default function ReceivePage() {
  const wallet = useActiveWallet();
  const network = useSettingsStore((s) => s.network);
  const config = getNetwork(network);
  const account = useAccountNode(wallet);
  const scan = useWalletScan(wallet);
  const utxos = useUtxos(wallet);
  const queryClient = useQueryClient();
  const bumpFloor = useWalletsStore((s) => s.bumpReceiveIndexFloor);

  const [amountBtc, setAmountBtc] = useState('');
  const [copied, setCopied] = useState(false);

  const floor = wallet?.receiveIndexFloor?.[network] ?? 0;
  const scannedNext = scan.data?.receive.nextIndex ?? 0;
  const index = Math.max(scannedNext, floor);
  const rotationsLeft = GAP_LIMIT - 1 - (index - scannedNext);

  const derived = useMemo(() => {
    if (!wallet || !account) return null;
    return deriveAddress(account, wallet.scriptType, network, 0, index);
  }, [wallet, account, network, index]);

  // The scan doesn't poll (it's expensive) — but when a payment lands on the
  // displayed address, re-scan so the next visitor gets a fresh address.
  useEffect(() => {
    if (derived && utxos.data?.some((u) => u.address === derived.address)) {
      void queryClient.invalidateQueries({ queryKey: [network, 'scan', wallet?.id] });
    }
  }, [derived, utxos.data, network, wallet?.id, queryClient]);

  const amountSats = useMemo(() => {
    try {
      return amountBtc ? btcToSats(amountBtc) : undefined;
    } catch {
      return undefined;
    }
  }, [amountBtc]);

  if (!wallet) return null;

  if (wallet.type === 'watch' && wallet.watchNetwork !== network) {
    return (
      <WrongNetworkNotice expected={wallet.watchNetwork} />
    );
  }

  if (!derived) return null;

  const uri = buildBip21({ address: derived.address, amountSats });

  async function copyAddress() {
    if (!derived) return;
    await navigator.clipboard.writeText(derived.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <PageTitle subtitle={`Share this address to receive ${config.unit}.`}>Receive</PageTitle>

      <Card className="flex flex-col items-center gap-4">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={uri} size={208} marginSize={0} />
        </div>

        <button
          onClick={copyAddress}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 transition hover:border-neutral-600"
          title="Copy address"
        >
          <span className="break-all font-mono text-xs text-neutral-200">
            {derived.address}
          </span>
          {copied ? (
            <Check size={14} className="shrink-0 text-emerald-400" />
          ) : (
            <Copy size={14} className="shrink-0 text-neutral-500 group-hover:text-neutral-300" />
          )}
        </button>

        <p className="text-xs text-neutral-500">
          Fresh address #{index + 1} — a new one per payer keeps your history private.
        </p>
      </Card>

      <div className="mt-4">
        <Label>Request a specific amount (optional)</Label>
        <div className="relative">
          <Input
            inputMode="decimal"
            value={amountBtc}
            onChange={(e) => setAmountBtc(e.target.value)}
            placeholder="0.001"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500">
            {config.unit}
          </span>
        </div>
        {amountBtc && amountSats === undefined && (
          <p className="mt-1 text-xs text-red-400">Enter a valid amount (max 8 decimals).</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={rotationsLeft <= 0 || scan.isPending}
          onClick={() => wallet && bumpFloor(wallet.id, network, index + 1)}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Plus size={15} /> New address
          </span>
        </Button>
      </div>
      {rotationsLeft <= 0 && (
        <p className="mt-2 text-xs text-amber-400/90">
          You&apos;ve rotated {GAP_LIMIT - 1} addresses ahead — use one of them first so wallets
          can still find all your funds when restoring.
        </p>
      )}

      {config.faucetUrl && (
        <a
          href={config.faucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block rounded-xl bg-accent-dim px-4 py-3 text-center text-sm font-semibold text-accent transition hover:brightness-110"
        >
          Get practice coins from a faucet
        </a>
      )}
    </div>
  );
}

function WrongNetworkNotice({ expected }: { expected?: 'mainnet' | 'testnet4' }) {
  const setNetwork = useSettingsStore((s) => s.setNetwork);
  if (!expected) return null;
  return (
    <Card className="mt-6 flex flex-col gap-3">
      <p className="text-sm text-neutral-300">
        This watch-only wallet lives on {getNetwork(expected).label}. Switch networks to see it.
      </p>
      <Button onClick={() => setNetwork(expected)}>
        Switch to {getNetwork(expected).label}
      </Button>
    </Card>
  );
}
