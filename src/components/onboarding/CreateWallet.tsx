'use client';

import { useState } from 'react';
import { createMnemonic, type MnemonicLength } from '@/lib/bitcoin/mnemonic';
import { setupHotWallet } from '@/lib/wallet/setup';
import { WrongPasswordError } from '@/lib/vault/crypto';
import { Button, Input, Label } from '@/components/ui';
import { PasswordStep } from './PasswordStep';

export function CreateWallet({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'options' | 'password'>('options');
  const [name, setName] = useState('My wallet');
  const [words, setWords] = useState<MnemonicLength>(12);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(password: string) {
    setBusy(true);
    setError(null);
    try {
      await setupHotWallet({
        name,
        mnemonic: createMnemonic(words),
        passphrase: passphrase || undefined,
        password,
      });
      onDone();
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Wrong password — this Satchel already has a password.'
          : 'Something went wrong creating the wallet.',
      );
      setBusy(false);
    }
  }

  if (step === 'password') {
    return (
      <PasswordStep
        busy={busy}
        error={error}
        submitLabel="Create wallet"
        onSubmit={handleCreate}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStep('password');
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <Label>Wallet name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
      </div>

      <div>
        <Label>Seed phrase length</Label>
        <div className="flex gap-2">
          {([12, 24] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWords(n)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm transition ${
                words === n
                  ? 'border-accent bg-accent-dim text-accent-strong'
                  : 'border-neutral-700 text-neutral-300'
              }`}
            >
              {n} words{n === 12 ? ' (recommended)' : ''}
            </button>
          ))}
        </div>
      </div>

      {showAdvanced ? (
        <div>
          <Label>BIP39 passphrase (optional, advanced)</Label>
          <Input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Leave empty unless you know what this is"
          />
          <p className="mt-2 text-xs text-amber-400/90">
            A passphrase creates a hidden wallet. Losing it means losing your funds — it is
            NOT stored in your seed phrase backup.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="self-start text-xs text-neutral-500 underline-offset-4 hover:underline"
        >
          Advanced options
        </button>
      )}

      <Button type="submit">Continue</Button>
    </form>
  );
}
