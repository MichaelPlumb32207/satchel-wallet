'use client';

import { useState } from 'react';
import { unlock, wipeVault } from '@/lib/vault/keyring';
import { WrongPasswordError } from '@/lib/vault/crypto';
import { useSessionStore } from '@/stores/session';
import { useActiveWallet, useWalletsStore } from '@/stores/wallets';

/**
 * Gates the app while the ACTIVE wallet needs keys: hot wallet + locked
 * keyring -> lock screen (content fully unmounted, nothing sensitive in the
 * DOM). Watch-only wallets are public data and stay viewable while locked.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const hasHydrated = useWalletsStore((s) => s.hasHydrated);
  const activeWallet = useActiveWallet();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight text-orange-400">Satchel</span>
      </div>
    );
  }

  if (activeWallet?.type !== 'hot' || status === 'unlocked') {
    return <>{children}</>;
  }

  return <LockScreen />;
}

function LockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Wrong password — try again.'
          : 'Could not unlock the wallet.',
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-orange-400">Satchel</h1>
        <p className="mt-2 text-sm text-neutral-400">Enter your password to unlock</p>
      </div>

      <form onSubmit={handleUnlock} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-orange-400"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!password || busy}
          className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-neutral-950 transition hover:bg-orange-400 disabled:opacity-50"
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>

      {showForgot ? (
        <ForgotPassword onCancel={() => setShowForgot(false)} />
      ) : (
        <button
          onClick={() => setShowForgot(true)}
          className="text-sm text-neutral-500 underline-offset-4 hover:underline"
        >
          Forgot password?
        </button>
      )}
      <WatchOnlyEscape />
    </div>
  );
}

/** Watch-only wallets don't need the password — offer a way to them. */
function WatchOnlyEscape() {
  const watchWallet = useWalletsStore((s) => s.wallets.find((w) => w.type === 'watch'));
  const setActiveWallet = useWalletsStore((s) => s.setActiveWallet);
  if (!watchWallet) return null;
  return (
    <button
      onClick={() => setActiveWallet(watchWallet.id)}
      className="text-sm text-neutral-500 underline-offset-4 hover:underline"
    >
      View “{watchWallet.name}” without unlocking
    </button>
  );
}

function ForgotPassword({ onCancel }: { onCancel: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  const removeWallet = useWalletsStore((s) => s.removeWallet);
  const hotWallets = useWalletsStore((s) => s.wallets.filter((w) => w.type === 'hot'));

  async function handleWipe() {
    await wipeVault();
    for (const wallet of hotWallets) removeWallet(wallet.id);
  }

  return (
    <div className="w-full max-w-xs rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm">
      <p className="font-semibold text-red-300">Reset Satchel</p>
      <p className="mt-2 text-neutral-300">
        Your password can&apos;t be recovered. You can erase this wallet and restore it from
        its seed phrase — <span className="font-semibold">only do this if you have your seed
        phrase written down</span>.
      </p>
      <input
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder='Type "WIPE" to confirm'
        className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-red-400"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleWipe}
          disabled={confirmation !== 'WIPE'}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-40"
        >
          Erase wallet
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-neutral-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
