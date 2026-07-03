'use client';

import { useEffect, useState } from 'react';
import { vaultExists } from '@/lib/vault/storage';
import { Button, ErrorText, Input, Label } from '@/components/ui';

/**
 * Sets (or asks for) the single Satchel password. If a vault already exists
 * (adding a second wallet), the existing password unlocks and re-encrypts it;
 * otherwise the user creates one here.
 */
export function PasswordStep({
  busy,
  error,
  submitLabel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (password: string) => void;
}) {
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void vaultExists().then(setHasVault);
  }, []);

  if (hasVault === null) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!hasVault) {
      if (password.length < 8) {
        setLocalError('Use at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setLocalError("Passwords don't match.");
        return;
      }
    }
    onSubmit(password);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hasVault ? (
        <div>
          <Label>Your Satchel password</Label>
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your existing password"
          />
          <p className="mt-2 text-xs text-neutral-500">
            One password protects every wallet in this Satchel.
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label>Create a password</Label>
            <Input
              type="password"
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same password again"
            />
          </div>
          <p className="text-xs text-neutral-500">
            This password encrypts your keys on this device. It can&apos;t be recovered — but
            your wallet always can be, from its seed phrase.
          </p>
        </>
      )}
      <ErrorText>{localError ?? error}</ErrorText>
      <Button type="submit" disabled={!password || busy}>
        {busy ? 'Working…' : submitLabel}
      </Button>
    </form>
  );
}
