'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  History,
  Home,
  Lock,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { getNetwork } from '@/lib/networks';
import { lock } from '@/lib/vault/keyring';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useActiveWallet, useWalletsStore } from '@/stores/wallets';
import { NetworkToggle } from './NetworkToggle';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/send', label: 'Send', icon: ArrowUpFromLine },
  { href: '/receive', label: 'Receive', icon: ArrowDownToLine },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useWalletsStore((s) => s.hasHydrated);
  const walletCount = useWalletsStore((s) => s.wallets.length);
  const activeWallet = useActiveWallet();
  const status = useSessionStore((s) => s.status);
  const network = useSettingsStore((s) => s.network);
  const config = getNetwork(network);

  // No wallets yet -> onboarding owns the screen.
  useEffect(() => {
    if (hasHydrated && walletCount === 0) router.replace('/onboarding');
  }, [hasHydrated, walletCount, router]);

  if (!hasHydrated || walletCount === 0) return null;

  const needsBackup = activeWallet?.type === 'hot' && !activeWallet.backupVerified;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-accent">
          Satchel
        </Link>
        <div className="flex items-center gap-2">
          <WalletSwitcher />
          <NetworkToggle />
          {activeWallet?.type === 'hot' && status === 'unlocked' && (
            <button
              onClick={lock}
              aria-label="Lock wallet"
              className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-200"
            >
              <Lock size={16} />
            </button>
          )}
        </div>
      </header>

      {config.isPractice && (
        <div className="mx-4 mb-2 rounded-xl bg-accent-dim px-4 py-2.5 text-sm text-accent-strong">
          Practice mode — these coins are free and worthless. Perfect for learning.
        </div>
      )}

      {needsBackup && pathname !== '/backup' && (
        <Link
          href="/backup"
          className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-amber-600/40 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-300 transition hover:bg-amber-950/70"
        >
          <ShieldAlert size={16} className="shrink-0" />
          Back up your wallet — without your seed phrase your bitcoin can be lost forever.
        </Link>
      )}

      <main className="flex-1 px-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  active ? 'text-accent' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function WalletSwitcher() {
  const wallets = useWalletsStore((s) => s.wallets);
  const setActiveWallet = useWalletsStore((s) => s.setActiveWallet);
  const active = useActiveWallet();
  const router = useRouter();

  if (!active) return null;
  if (wallets.length === 1) {
    return (
      <span className="max-w-28 truncate text-sm text-neutral-300" title={active.name}>
        {active.name}
      </span>
    );
  }

  return (
    <div className="relative">
      <select
        value={active.id}
        onChange={(e) => {
          if (e.target.value === '__add__') router.push('/onboarding?add=1');
          else setActiveWallet(e.target.value);
        }}
        aria-label="Switch wallet"
        className="max-w-32 appearance-none truncate rounded-lg border border-neutral-800 bg-neutral-900 py-1 pl-2 pr-6 text-sm text-neutral-200 outline-none focus:border-accent"
      >
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
            {w.type === 'watch' ? ' 👁' : ''}
          </option>
        ))}
        <option value="__add__">+ Add wallet…</option>
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  );
}
