'use client';

import { useMemo, useState } from 'react';
import { parseWatchOnlyInput } from '@/lib/bitcoin/slip132';
import { NETWORKS } from '@/lib/networks';
import { setupWatchWallet } from '@/lib/wallet/setup';
import { Button, ErrorText, Input, Label, TextArea } from '@/components/ui';
import { ScanStep } from './ScanStep';

export function ImportWatch({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState('');
  const [name, setName] = useState('Watch-only');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { ok: true as const, ...parseWatchOnlyInput(input) };
    } catch (err) {
      return { ok: false as const, message: (err as Error).message };
    }
  }, [input]);

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed?.ok) return;
    try {
      const { id } = setupWatchWallet({ name, input });
      setWalletId(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (walletId) {
    return <ScanStep walletId={walletId} onDone={onDone} />;
  }

  return (
    <form onSubmit={handleImport} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-400">
        Watch a wallet&apos;s balance and history without its keys — for example your hardware
        wallet&apos;s <span className="font-mono">xpub</span>. Satchel can never spend from a
        watch-only wallet.
      </p>

      <div>
        <Label>Extended public key or descriptor</Label>
        <TextArea
          autoFocus
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="xpub… / zpub… / tpub… / vpub… or wpkh([…]xpub…/0/*)"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="font-mono text-xs"
        />
        <div className="mt-1.5 text-xs">
          {parsed?.ok ? (
            <span className="text-emerald-400">
              ✓ Valid key — {NETWORKS[parsed.network].label}
              {parsed.network === 'testnet4' ? '' : ''}
            </span>
          ) : parsed ? (
            <span className="text-red-400">{parsed.message}</span>
          ) : (
            <span className="text-neutral-500">Paste from your hardware or software wallet</span>
          )}
        </div>
        {parsed?.ok && parsed.scriptHint === null && (
          <p className="mt-1 text-xs text-amber-400/90">
            Plain xpubs don&apos;t say which address type they use — Satchel assumes native
            SegWit (bc1q…). If balances look empty, the source wallet may use a different type.
          </p>
        )}
      </div>

      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
      </div>

      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={!parsed?.ok}>
        Start watching
      </Button>
    </form>
  );
}
