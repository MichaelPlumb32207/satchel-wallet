'use client';

import { useMemo, useState } from 'react';
import { isBip39Word, isValidMnemonic, normalizeMnemonic } from '@/lib/bitcoin/mnemonic';
import { setupHotWallet } from '@/lib/wallet/setup';
import { WrongPasswordError } from '@/lib/vault/crypto';
import { Button, ErrorText, Input, Label, TextArea } from '@/components/ui';
import { PasswordStep } from './PasswordStep';
import { ScanStep } from './ScanStep';

export function ImportSeed({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'seed' | 'password' | 'scan'>('seed');
  const [name, setName] = useState('Imported wallet');
  const [input, setInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  const words = useMemo(
    () => normalizeMnemonic(input).split(' ').filter(Boolean),
    [input],
  );
  const badWords = useMemo(() => words.filter((w) => !isBip39Word(w)), [words]);
  const lengthOk = [12, 15, 18, 21, 24].includes(words.length);
  const checksumOk = lengthOk && badWords.length === 0 && isValidMnemonic(input);

  let seedHint: string | null = null;
  if (words.length > 0) {
    if (badWords.length > 0) seedHint = `Not BIP39 words: ${badWords.slice(0, 3).join(', ')}`;
    else if (!lengthOk) seedHint = `${words.length} words — a seed phrase has 12 or 24`;
    else if (!checksumOk) seedHint = 'Checksum doesn’t match — double-check the words and order';
  }

  async function handleImport(password: string) {
    setBusy(true);
    setError(null);
    try {
      const id = await setupHotWallet({
        name,
        mnemonic: input,
        passphrase: passphrase || undefined,
        password,
      });
      setWalletId(id);
      setStep('scan');
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Wrong password — this Satchel already has a password.'
          : 'Something went wrong importing the wallet.',
      );
      setBusy(false);
    }
  }

  if (step === 'scan' && walletId) {
    return <ScanStep walletId={walletId} onDone={onDone} />;
  }

  if (step === 'password') {
    return (
      <PasswordStep busy={busy} error={error} submitLabel="Import wallet" onSubmit={handleImport} />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (checksumOk) setStep('password');
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <Label>Seed phrase</Label>
        <TextArea
          autoFocus
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your 12 or 24 words separated by spaces"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className={checksumOk ? 'text-emerald-400' : 'text-neutral-500'}>
            {checksumOk ? '✓ Valid seed phrase' : (seedHint ?? 'Words are checked as you type')}
          </span>
          <span className="text-neutral-600">{words.length} words</span>
        </div>
      </div>

      <div>
        <Label>Wallet name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
      </div>

      {showAdvanced ? (
        <div>
          <Label>BIP39 passphrase (if this wallet used one)</Label>
          <Input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Usually empty"
          />
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

      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={!checksumOk}>
        Continue
      </Button>
    </form>
  );
}
