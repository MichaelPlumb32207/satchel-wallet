'use client';

import Link from 'next/link';
import { ArrowLeft, Code2, ExternalLink, Shield } from 'lucide-react';
import { getBuildInfo } from '@/lib/buildInfo';
import { Card, PageTitle } from '@/components/ui';

/**
 * Public trust page: self-custody model, threat model, open source, and a
 * link from this deployed build to the exact GitHub commit that produced it.
 */
export default function SecurityPage() {
  const build = getBuildInfo();

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <Link
          href="/settings"
          className="mb-3 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
        >
          <ArrowLeft size={12} /> Settings
        </Link>
        <PageTitle subtitle="How Satchel keeps your bitcoin yours — and what it does not claim.">
          Security &amp; trust
        </PageTitle>
      </div>

      <Card className="flex items-start gap-3">
        <Shield size={20} className="mt-0.5 shrink-0 text-accent" />
        <div className="text-sm leading-relaxed text-neutral-300">
          <p className="font-medium text-neutral-100">Self-custodial by design</p>
          <p className="mt-1 text-neutral-400">
            Your seed phrase and password never leave this device. Satchel has no
            account system, no server that holds keys, and no recovery desk that
            can reset your wallet. If you lose the seed, no one can get the
            funds back — including us.
          </p>
        </div>
      </Card>

      <Section title="What we do">
        <ul className="list-disc space-y-2 pl-4 text-sm text-neutral-400">
          <li>
            Generate keys on your device and encrypt them with your password
            (scrypt + AES-256-GCM) in this browser&apos;s storage.
          </li>
          <li>
            Talk to the public{' '}
            <a
              href="https://mempool.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              mempool.space
            </a>{' '}
            API for balances, history, fees, and broadcasting — keyless, same
            data anyone can query.
          </li>
          <li>
            Publish the full source code so anyone can read how signing, scanning,
            and encryption work.
          </li>
        </ul>
      </Section>

      <Section title="What we never do">
        <ul className="list-disc space-y-2 pl-4 text-sm text-neutral-400">
          <li>Upload your seed, password, or private keys anywhere.</li>
          <li>Require an email, phone number, or cloud account.</li>
          <li>Run a backend that sees your balances or transactions as “your account.”</li>
          <li>Claim a formal third-party security audit (yet) — open source is reviewable; “audited” means a published review we haven&apos;t commissioned.</li>
        </ul>
      </Section>

      <Section title="Threat model (honest)">
        <ul className="list-disc space-y-2 pl-4 text-sm text-neutral-400">
          <li>
            <span className="text-neutral-300">Device malware or a compromised browser</span>{' '}
            can steal keys after unlock — same as any software wallet.
          </li>
          <li>
            <span className="text-neutral-300">Phishing</span> — always check
            you&apos;re on the real site; never type a seed into a page that
            “needs it to verify” your wallet.
          </li>
          <li>
            <span className="text-neutral-300">Physical access</span> — someone
            with your unlocked device (or password + device) can spend. Use
            auto-lock and a strong password.
          </li>
          <li>
            <span className="text-neutral-300">Supply chain</span> — you trust
            this site&apos;s hosting and the open-source dependencies. Prefer
            matching the live build to the public commit below.
          </li>
        </ul>
      </Section>

      <Section title="Open source">
        <p className="text-sm text-neutral-400">
          The code is public on GitHub. You can read it, run it yourself, and
          compare changes over time. That makes it{' '}
          <span className="text-neutral-300">reviewable</span> — it does not by
          itself mean a firm has signed off on every line.
        </p>
        <a
          href={build.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <Code2 size={16} />
          github.com/MichaelPlumb32207/satchel-wallet
          <ExternalLink size={12} className="opacity-70" />
        </a>
      </Section>

      <Section title="This build">
        <p className="text-sm text-neutral-400">
          Production deploys are built from the <code className="text-neutral-300">main</code>{' '}
          branch on GitHub. The commit baked into this page should match the
          source that produced the site you&apos;re using.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Version</dt>
            <dd className="font-mono text-neutral-200">v{build.version}</dd>
          </div>
          {build.ref ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Branch</dt>
              <dd className="font-mono text-neutral-200">{build.ref}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Commit</dt>
            <dd>
              {build.isProductionBuild ? (
                <a
                  href={build.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-accent hover:underline"
                >
                  {build.shortSha}
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              ) : (
                <span className="font-mono text-neutral-400" title="Local or non-Vercel build">
                  dev (no deploy SHA)
                </span>
              )}
            </dd>
          </div>
        </dl>
        {build.isProductionBuild && (
          <p className="mt-3 text-xs text-neutral-500">
            Tip: open the commit link and confirm it matches what you expect on{' '}
            <code className="text-neutral-400">main</code>.
          </p>
        )}
      </Section>

      <Section title="Your responsibilities">
        <ul className="list-disc space-y-2 pl-4 text-sm text-neutral-400">
          <li>Write the seed on paper; never screenshot or store it in cloud notes.</li>
          <li>Practice with free coins first, then move real funds when you&apos;re comfortable.</li>
          <li>Only you can restore a forgotten password — via the seed, not a support ticket.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">{title}</h2>
      <Card className="flex flex-col gap-1">{children}</Card>
    </section>
  );
}
