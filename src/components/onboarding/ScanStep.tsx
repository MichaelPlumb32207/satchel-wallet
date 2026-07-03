'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getAddressInfo } from '@/lib/api/mempool';
import { getNetwork } from '@/lib/networks';
import { resolveAccount } from '@/lib/wallet/account';
import { scanAccount, type ScanResult } from '@/lib/wallet/scanner';
import { useSettingsStore } from '@/stores/settings';
import { useWalletsStore } from '@/stores/wallets';
import { Button, Card } from '@/components/ui';

/**
 * Post-import restore scan with live progress. Seeds the react-query cache
 * so the dashboard renders instantly afterwards.
 */
export function ScanStep({ walletId, onDone }: { walletId: string; onDone: () => void }) {
  const network = useSettingsStore((s) => s.network);
  const wallet = useWalletsStore((s) => s.wallets.find((w) => w.id === walletId));
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !wallet) return;
    startedRef.current = true;

    void (async () => {
      await Promise.resolve(); // effects must not set state synchronously
      const account = resolveAccount(wallet, network);
      if (!account) {
        setError('Could not open the wallet for scanning.');
        return;
      }
      const apiBase = getNetwork(network).apiBase;
      try {
        const scan = await scanAccount(account, wallet.scriptType, network, {
          isUsed: async (address) => {
            const info = await getAddressInfo(apiBase, address);
            return info.chain_stats.tx_count + info.mempool_stats.tx_count > 0;
          },
          onProgress: setChecked,
        });
        queryClient.setQueryData([network, 'scan', wallet.id], scan);
        setResult(scan);
      } catch {
        setError('Network error while scanning — your wallet was still imported.');
      }
    })();
  }, [wallet, network, queryClient]);

  if (error) {
    return (
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button onClick={onDone}>Continue anyway</Button>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-accent" />
        <p className="text-sm text-neutral-300">Looking for your transaction history…</p>
        <p className="text-xs text-neutral-500">{checked} addresses checked</p>
      </Card>
    );
  }

  const usedCount = result.usedAddresses.length;
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-neutral-200">
        {usedCount > 0
          ? `Found activity on ${usedCount} address${usedCount === 1 ? '' : 'es'}. Your balance and history will appear on the home screen.`
          : 'No previous activity found on this network — the wallet is ready to use.'}
      </p>
      <Button onClick={onDone} autoFocus>
        Open my wallet
      </Button>
    </Card>
  );
}
