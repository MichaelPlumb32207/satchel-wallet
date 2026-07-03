'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Check, Copy, ShieldCheck, ShieldAlert } from 'lucide-react';
import { accountXpub } from '@/lib/bitcoin/derivation';
import { NETWORKS, type NetworkId } from '@/lib/networks';
import { WrongPasswordError } from '@/lib/vault/crypto';
import {
  changePassword,
  removeWallet as removeVaultWallet,
  wipeVault,
} from '@/lib/vault/keyring';
import { useAccountNode } from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet, useWalletsStore } from '@/stores/wallets';
import { Button, Card, ErrorText, Input, Label, PageTitle } from '@/components/ui';

export default function SettingsPage() {
  const wallet = useActiveWallet();
  if (!wallet) return null;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageTitle>Settings</PageTitle>
      <WalletSection />
      <NetworkSection />
      <DisplaySection />
      <SecuritySection />
      <DangerSection />
      <p className="text-center text-xs text-neutral-600">
        Satchel v0.1 — your keys never leave this device.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">{title}</h2>
      <Card className="flex flex-col gap-4">{children}</Card>
    </section>
  );
}

function WalletSection() {
  const wallet = useActiveWallet();
  const renameWallet = useWalletsStore((s) => s.renameWallet);
  const account = useAccountNode(wallet);
  const [showXpub, setShowXpub] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!wallet) return null;
  const xpub = showXpub && account ? accountXpub(account) : null;

  return (
    <Section title="Wallet">
      <div>
        <Label>Name</Label>
        <Input
          value={wallet.name}
          onChange={(e) => renameWallet(wallet.id, e.target.value)}
          maxLength={30}
        />
      </div>

      {wallet.type === 'hot' && (
        <Link href="/backup" className="flex items-center gap-2 text-sm">
          {wallet.backupVerified ? (
            <>
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-neutral-300">Seed phrase backed up</span>
              <span className="ml-auto text-xs text-accent">View again</span>
            </>
          ) : (
            <>
              <ShieldAlert size={16} className="text-amber-400" />
              <span className="text-amber-300">Back up your seed phrase</span>
              <span className="ml-auto text-xs text-accent">Do it now</span>
            </>
          )}
        </Link>
      )}

      <div>
        <button
          onClick={() => setShowXpub(!showXpub)}
          className="text-sm text-accent underline-offset-4 hover:underline"
        >
          {showXpub ? 'Hide' : 'Show'} account public key (xpub)
        </button>
        {showXpub && !xpub && (
          <p className="mt-2 text-xs text-neutral-500">Unlock the wallet to derive its xpub.</p>
        )}
        {xpub && (
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="rounded-lg bg-white p-2">
              <QRCodeSVG value={xpub} size={140} marginSize={0} />
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(xpub);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex w-full items-center justify-center gap-2 break-all rounded-lg border border-neutral-800 p-2 font-mono text-[10px] text-neutral-400"
            >
              {xpub}
              {copied ? (
                <Check size={12} className="shrink-0 text-emerald-400" />
              ) : (
                <Copy size={12} className="shrink-0" />
              )}
            </button>
            <p className="text-xs text-neutral-500">
              Sharing this reveals your full balance and history (but can&apos;t spend). Use it
              to set up watch-only on another device.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

function NetworkSection() {
  const network = useSettingsStore((s) => s.network);
  const setNetwork = useSettingsStore((s) => s.setNetwork);

  return (
    <Section title="Network">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(NETWORKS) as NetworkId[]).map((id) => (
          <button
            key={id}
            onClick={() => setNetwork(id)}
            className={`rounded-xl border px-3 py-3 text-sm transition ${
              network === id
                ? 'border-accent bg-accent-dim font-semibold'
                : 'border-neutral-700 text-neutral-300'
            }`}
          >
            {NETWORKS[id].label}
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Practice mode uses testnet4 — free coins from faucets, perfect for learning. Your
        wallet has separate addresses and balances on each network.
      </p>
    </Section>
  );
}

function DisplaySection() {
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const unit = useSettingsStore((s) => s.unit);
  const setUnit = useSettingsStore((s) => s.setUnit);

  return (
    <Section title="Display">
      <div className="flex items-center justify-between">
        <Label>Currency</Label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          {(['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'AUD', 'JPY'] as const).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <Label>Amounts in</Label>
        <div className="flex gap-1 rounded-lg border border-neutral-700 p-0.5">
          {(['btc', 'sats'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                unit === u ? 'bg-accent text-accent-contrast' : 'text-neutral-400'
              }`}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function SecuritySection() {
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useSettingsStore((s) => s.setAutoLockMinutes);
  const lockOnHide = useSettingsStore((s) => s.lockOnHide);
  const setLockOnHide = useSettingsStore((s) => s.setLockOnHide);
  const [showChangePw, setShowChangePw] = useState(false);

  return (
    <Section title="Security">
      <div className="flex items-center justify-between">
        <Label>Auto-lock after</Label>
        <select
          value={autoLockMinutes}
          onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option value={1}>1 minute</option>
          <option value={5}>5 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={60}>1 hour</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <Label>When tab is hidden</Label>
        <select
          value={lockOnHide}
          onChange={(e) => setLockOnHide(e.target.value as typeof lockOnHide)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option value="immediate">Lock immediately</option>
          <option value="60s">Lock after 1 minute</option>
          <option value="never">Don&apos;t lock</option>
        </select>
      </div>
      {showChangePw ? (
        <ChangePasswordForm onDone={() => setShowChangePw(false)} />
      ) : (
        <button
          onClick={() => setShowChangePw(true)}
          className="self-start text-sm text-accent underline-offset-4 hover:underline"
        >
          Change password
        </button>
      )}
    </Section>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw.length < 8) return setError('New password needs at least 8 characters.');
    if (newPw !== confirm) return setError("New passwords don't match.");
    setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      setDone(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Current password is wrong.' : 'Failed.');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="text-sm text-emerald-400">Password changed.</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input
        type="password"
        placeholder="Current password"
        value={oldPw}
        onChange={(e) => setOldPw(e.target.value)}
        autoComplete="current-password"
      />
      <Input
        type="password"
        placeholder="New password (8+ characters)"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !oldPw || !newPw} className="flex-1">
          {busy ? 'Re-encrypting…' : 'Change password'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DangerSection() {
  const wallet = useActiveWallet();
  const wallets = useWalletsStore((s) => s.wallets);
  const removeWalletMeta = useWalletsStore((s) => s.removeWallet);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!wallet) return null;

  async function handleRemove() {
    if (!wallet) return;
    setError(null);
    try {
      if (wallet.type === 'hot') {
        await removeVaultWallet(password, wallet.id);
      }
      removeWalletMeta(wallet.id);
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Wrong password.' : 'Failed to remove.');
    }
  }

  async function handleWipeAll() {
    await wipeVault();
    for (const w of wallets) removeWalletMeta(w.id);
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-red-400">Danger zone</h2>
      <Card className="flex flex-col gap-4 border-red-900/50">
        {!confirmRemove ? (
          <button
            onClick={() => setConfirmRemove(true)}
            className="self-start text-sm text-red-400 underline-offset-4 hover:underline"
          >
            Remove “{wallet.name}” from this device
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-300">
              {wallet.type === 'hot'
                ? 'Removing a wallet deletes its keys from this device. Only proceed if you have its seed phrase written down.'
                : 'This stops watching the wallet — no keys are involved, you can re-add the xpub any time.'}
            </p>
            {wallet.type === 'hot' && (
              <Input
                type="password"
                placeholder="Satchel password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                disabled={wallet.type === 'hot' && !password}
                onClick={handleRemove}
              >
                Remove wallet
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <WipeAll onWipe={handleWipeAll} />
      </Card>
    </section>
  );
}

function WipeAll({ onWipe }: { onWipe: () => Promise<void> }) {
  const [confirmation, setConfirmation] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-sm text-red-400 underline-offset-4 hover:underline"
      >
        Erase Satchel from this device
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
      <p className="text-sm text-neutral-300">
        Deletes every wallet, key, and setting on this device. Funds are only recoverable
        from seed phrases you&apos;ve written down.
      </p>
      <Input
        placeholder='Type "WIPE" to confirm'
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          variant="danger"
          className="flex-1"
          disabled={confirmation !== 'WIPE'}
          onClick={onWipe}
        >
          Erase everything
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
