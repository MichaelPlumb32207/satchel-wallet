# Satchel — Project Intelligence (CLAUDE.md)

Last Updated: 2026-07-03
Version: 0.1.0

Authoritative context for AI assistants working on Satchel. The root
`/CLAUDE.md` is a thin pointer here.

## Project context
Satchel is a **self-custodial, on-chain Bitcoin wallet** — a Next.js 16 PWA,
fully client-side, no backend. Ground-up rewrite of the `bitpoc-ui` POC.
Keys are generated on-device, encrypted with the user's password, and never
leave it. Supports watch-only wallets and a first-class testnet4 "Practice
mode." Live at satchel-wallet.vercel.app.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 ·
`@scure`/`@noble` crypto · Zustand · TanStack Query · idb-keyval ·
qrcode.react · qr-scanner · lucide-react. No database, no server, no env vars.

## Mandatory protocol (this user, every project)
For **every** code change / feature / fix: (1) implement with best practices,
(2) **read and update ALL eight living docs in `/docs/`** even if only to
confirm "no change required" — `BACKLOG.md`, `CLAUDE.md`, `MEMORY.md`,
`PROGRESS.md`, `README.md`, `ROADMAP.md`, `USE_CASE_CATALOG.md`,
`USER_GUIDE.md` — matching each doc's existing format. `USE_CASE_CATALOG.md`
embeds its own verification (happy path + edge cases per use case, plus a core
coverage table) — there is no separate `TEST_PLAN.md`.
(3) commit and push to `main` (Vercel auto-deploys). Never commit code without
the doc pass.

## External API verification
Only external dependency is the public **mempool.space REST API** (keyless).
Do NOT pin rate limits or prices (they rot) — pin the endpoint + last-verified
date. Docs: <https://mempool.space/docs/api/rest>.

| Capability | Endpoint (base + `/testnet4`) | Last verified |
|---|---|---|
| Address info / UTXOs / txs | `/address/:a`, `/address/:a/utxo`, `/address/:a/txs/{chain,mempool}` | 2026-07-03 |
| Transaction | `/tx/:txid`, `/tx/:txid/hex` | 2026-07-03 |
| Recommended fees | `/v1/fees/recommended` | 2026-07-03 |
| Prices (mainnet only) | `/v1/prices` | 2026-07-03 |
| Tip height | `/blocks/tip/height` | 2026-07-03 |
| Broadcast | `POST /tx` (raw hex body) | 2026-07-03 |

## Key patterns
- **Security core** = `src/lib/vault/{crypto,storage,keyring}.ts`. Secrets live
  ONLY in the keyring module closure; never in Zustand/React/props.
- **Derivation** = `src/lib/bitcoin/derivation.ts`, parameterized by
  `ScriptType` + `NetworkId`; both external and change chains.
- **Money math** in bigint sats via `src/lib/bitcoin/units.ts` — never floats.
- **API** through `src/lib/api/mempool.ts` (paced, retrying); consumed via
  TanStack Query hooks in `src/hooks/useWalletData.ts`, keys namespaced by network.
- **Send/bump** orchestration in `src/lib/wallet/{send,bump}.ts`; PSBT in
  `src/lib/bitcoin/psbt.ts`.

## Common tasks
- Run tests: `npm test`. Pre-push gate: `npm run verify` (typecheck→lint→test→build).
- Local app: `npm run dev`. Deploy: `git push origin HEAD:main` → Vercel.
- Add a wallet feature: touch the pure lib + a test first, then the hook, then UI.

## Gotchas
- **mempool.space throttles bursts** — see MEMORY.md. Scans run once/session;
  don't add polling that sweeps many addresses.
- **No secrets in env** — static client bundle; `NEXT_PUBLIC_` = public.
- **Turbopack build** — don't add webpack-plugin-based tooling (why the SW is
  hand-rolled, not Serwist).
- **Don't spend unconfirmed receives** — the send flow filters them out by
  design; CPFP will be the explicit exception.
- **Change goes to the internal chain** (`/1/i`) — never reuse a receive
  address for change (the POC bug this rewrite fixed).

## Accounts / infra (per global CLAUDE.md)
GitHub `MichaelPlumb32207`, commits authored `Michael Plumb <meplumb@gmail.com>`.
Vercel team **Liberty Concierge**. One push to `main` per change; never
`vercel --prod` (double-bills). No Neon/DB for this project.

---
_Last updated 2026-07-03 (v0.1.0 — 8-doc set: merged verification into USE_CASE_CATALOG (ENH-002); ENH-001 onboarding toggle pending deploy)._
