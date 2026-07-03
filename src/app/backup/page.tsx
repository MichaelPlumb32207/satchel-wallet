'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { wordlist } from '@/lib/bitcoin/mnemonic';
import { WrongPasswordError } from '@/lib/vault/crypto';
import { revealSecret } from '@/lib/vault/keyring';
import { useActiveWallet, useWalletsStore } from '@/stores/wallets';
import { Button, Card, ErrorText, Input, Label } from '@/components/ui';

type Step = 'password' | 'reveal' | 'quiz' | 'done';

export default function BackupPage() {
  const router = useRouter();
  const wallet = useActiveWallet();
  const markBackupVerified = useWalletsStore((s) => s.markBackupVerified);

  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<string[] | null>(null);
  const [passphraseSet, setPassphraseSet] = useState(false);

  if (!wallet || wallet.type !== 'hot') {
    return (
      <Shell onBack={() => router.push('/')}>
        <p className="text-sm text-neutral-400">Nothing to back up for this wallet.</p>
      </Shell>
    );
  }

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      const secret = await revealSecret(password, wallet.id);
      setWords(secret.mnemonic.split(' '));
      setPassphraseSet(!!secret.passphrase);
      setStep('reveal');
    } catch (err) {
      setError(
        err instanceof WrongPasswordError ? 'Wrong password.' : 'Could not open the vault.',
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  function handleQuizPassed() {
    if (!wallet) return;
    markBackupVerified(wallet.id);
    setWords(null); // drop the secret from memory as soon as possible
    setStep('done');
  }

  return (
    <Shell onBack={() => router.push('/')}>
      {step === 'password' && (
        <form onSubmit={handleReveal} className="flex flex-col gap-4">
          <h1 className="text-xl font-bold tracking-tight">Back up your wallet</h1>
          <p className="text-sm leading-relaxed text-neutral-400">
            Your seed phrase is the master key to your bitcoin. Anyone who sees it can take
            your funds; if you lose it and this device, your funds are gone. You&apos;ll write
            it down on paper, then Satchel will quiz you.
          </p>
          <div>
            <Label>Satchel password</Label>
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to reveal"
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={!password || busy}>
            {busy ? 'Unlocking…' : 'Reveal seed phrase'}
          </Button>
        </form>
      )}

      {step === 'reveal' && words && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold tracking-tight">Write these {words.length} words down</h1>
          <p className="text-sm text-neutral-400">
            On paper, in order. Don&apos;t screenshot them — anything on your screen can end up
            in cloud backups.
          </p>
          <Card>
            <ol className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {words.map((word, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="w-5 text-right font-mono text-xs text-neutral-500">
                    {i + 1}
                  </span>
                  <span className="font-medium">{word}</span>
                </li>
              ))}
            </ol>
          </Card>
          {passphraseSet && (
            <p className="rounded-xl border border-amber-600/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-300">
              This wallet also uses a BIP39 passphrase. The words above are NOT enough on
              their own — you must remember the passphrase too.
            </p>
          )}
          <Button onClick={() => setStep('quiz')}>I wrote them down — quiz me</Button>
        </div>
      )}

      {step === 'quiz' && words && (
        <Quiz words={words} onPassed={handleQuizPassed} onRetry={() => setStep('reveal')} />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <ShieldCheck size={40} className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">Backup verified</h1>
          <p className="max-w-xs text-sm text-neutral-400">
            Keep that paper somewhere safe and private. It can restore this wallet on any
            device, any time.
          </p>
          <Button onClick={() => router.push('/')} className="w-full max-w-xs">
            Done
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-lg font-bold tracking-tight text-accent">Satchel</span>
      </header>
      {children}
    </div>
  );
}

interface QuizQuestion {
  index: number;
  options: string[];
}

function buildQuiz(words: string[]): QuizQuestion[] {
  const indices = shuffle(words.map((_, i) => i)).slice(0, 3).sort((a, b) => a - b);
  return indices.map((index) => {
    const decoys = new Set<string>();
    while (decoys.size < 3) {
      const candidate = wordlist[Math.floor(Math.random() * wordlist.length)];
      if (candidate !== words[index]) decoys.add(candidate);
    }
    return { index, options: shuffle([words[index], ...decoys]) };
  });
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Quiz({
  words,
  onPassed,
  onRetry,
}: {
  words: string[];
  onPassed: () => void;
  onRetry: () => void;
}) {
  const [questions] = useState(() => buildQuiz(words));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState(false);

  const allAnswered = questions.every((q) => answers[q.index]);

  function handleCheck() {
    const correct = questions.every((q) => answers[q.index] === words[q.index]);
    if (correct) onPassed();
    else setFailed(true);
  }

  if (failed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight">Not quite</h1>
        <p className="text-sm text-neutral-400">
          At least one word didn&apos;t match. Check your paper backup against the words and
          try again — this matters.
        </p>
        <Button onClick={onRetry}>Show the words again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight">Quick check</h1>
      {questions.map((q) => (
        <div key={q.index}>
          <Label>Word #{q.index + 1}</Label>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.index]: option }))}
                className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                  answers[q.index] === option
                    ? 'border-accent bg-accent-dim text-accent-strong'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={handleCheck} disabled={!allAnswered}>
        Verify backup
      </Button>
    </div>
  );
}
