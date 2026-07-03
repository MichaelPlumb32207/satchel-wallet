'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Eye, KeyRound, Sparkles } from 'lucide-react';
import { CreateWallet } from '@/components/onboarding/CreateWallet';
import { ImportSeed } from '@/components/onboarding/ImportSeed';
import { ImportWatch } from '@/components/onboarding/ImportWatch';
import { useWalletsStore } from '@/stores/wallets';

type Mode = 'chooser' | 'create' | 'import' | 'watch';

const MODE_TITLES: Record<Exclude<Mode, 'chooser'>, string> = {
  create: 'Create a new wallet',
  import: 'Import a seed phrase',
  watch: 'Watch-only wallet',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('chooser');
  const hasWallets = useWalletsStore((s) => s.wallets.length > 0);

  const done = () => router.replace('/');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        {mode !== 'chooser' ? (
          <button
            onClick={() => setMode('chooser')}
            aria-label="Back"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
          >
            <ArrowLeft size={18} />
          </button>
        ) : hasWallets ? (
          <button
            onClick={done}
            aria-label="Back to wallet"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <span className="text-lg font-bold tracking-tight text-accent">Satchel</span>
      </header>

      {mode === 'chooser' ? (
        <div className="flex flex-1 flex-col">
          {!hasWallets && (
            <div className="mb-8 mt-4">
              <h1 className="text-2xl font-bold tracking-tight">
                A wallet that carries your sats.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Self-custodial Bitcoin: your keys are created on this device, encrypted with
                your password, and never leave it.
              </p>
            </div>
          )}
          {hasWallets && (
            <h1 className="mb-6 text-xl font-bold tracking-tight">Add a wallet</h1>
          )}

          <div className="flex flex-col gap-3">
            <ChooserButton
              icon={<Sparkles size={20} />}
              title="Create a new wallet"
              subtitle="Fresh keys, ready in seconds"
              onClick={() => setMode('create')}
            />
            <ChooserButton
              icon={<KeyRound size={20} />}
              title="I have a seed phrase"
              subtitle="Restore an existing wallet"
              onClick={() => setMode('import')}
            />
            <ChooserButton
              icon={<Eye size={20} />}
              title="Watch-only"
              subtitle="Follow an xpub without its keys"
              onClick={() => setMode('watch')}
            />
          </div>

          {!hasWallets && (
            <p className="mt-auto pt-8 text-center text-xs text-neutral-600">
              Tip: you can try everything risk-free in Practice mode with free testnet coins.
            </p>
          )}
        </div>
      ) : (
        <div>
          <h1 className="mb-5 text-xl font-bold tracking-tight">{MODE_TITLES[mode]}</h1>
          {mode === 'create' && <CreateWallet onDone={done} />}
          {mode === 'import' && <ImportSeed onDone={done} />}
          {mode === 'watch' && <ImportWatch onDone={done} />}
        </div>
      )}
    </div>
  );
}

function ChooserButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-left transition hover:border-neutral-600"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-neutral-100">{title}</span>
        <span className="block text-xs text-neutral-500">{subtitle}</span>
      </span>
    </button>
  );
}
