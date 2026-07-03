# Satchel — Progress

Last Updated: 2026-07-03
Version: 0.1.0

## Session Log

### Session 1 — 2026-07-02 → 2026-07-03 — Full rewrite of bitpoc-ui → Satchel, ship & deploy

**Context:** Ground-up rewrite of the `bitpoc-ui` proof of concept (deprecated
CRA tooling, unencrypted seed, change-to-receive-address privacy bug) into a
security-first, self-custodial Bitcoin PWA people will actually use.

**Infrastructure:**
- `create-next-app` (Next.js 16, TS, Tailwind v4, App Router, src dir, Turbopack)
- Crypto stack: `@scure/bip39` + `@scure/bip32` + `@scure/btc-signer` +
  `@noble/*` + `@scure/base` — audited, pure-ESM, no Node polyfills
- State: Zustand + TanStack Query; storage: idb-keyval (IndexedDB)
- GitHub repo (public): MichaelPlumb32207/satchel-wallet
- Vercel project `satchel-wallet` (team Liberty Concierge), auto-deploy from `main`
- **No backend, no database, no env vars** — only external dep is the public
  mempool.space REST API (keyless)

**Milestones delivered (M1–M6):**
- **M1 — Crypto core:** mnemonic, BIP84/86 derivation (external + internal
  change chains, fixing the POC bug), address validation, SLIP-132, BIP21,
  per-script-type fee/vsize tables, effective-value coin selection. 66 tests
  vs published BIP vectors.
- **M2 — Vault + session:** scrypt (N=2¹⁶) + AES-256-GCM vault in IndexedDB;
  keys held only in a module-closure keyring, wiped on lock; auto-lock on
  idle/tab-hide/page-hide; LockGate unmounts wallet UI when locked.
- **M3 — Onboarding + receive:** create / import-seed / import-watch-only
  flows; password-gated seed reveal + 3-word verification quiz; mempool.space
  client (concurrency-capped, retrying); gap-limit restore scanner; receive
  page (QR, BIP21, address rotation).
- **M4 — Dashboard + explorer:** balance (BTC/sats + fiat), classified tx
  history, slim tx/address explorer pages, watch-only read path (viewable
  while locked), network switch + practice-mode theming, wallet switcher.
- **M5 — Send + RBF:** 3-step send (recipient validation w/ network-mismatch,
  BIP21, QR scan, fee presets + custom, MAX), PSBT build/sign/broadcast,
  RBF fee-bump dialog with BIP125 floor enforcement.
- **M6 — PWA + polish:** settings (network/display/security/danger zone, xpub
  export), manifest + hand-rolled app-shell service worker, TanStack Query
  offline persister, strict CSP + security headers.

**Post-deploy (smoke test):**
- ENH-001: added the network/Practice toggle to onboarding (it only existed in
  the post-onboarding shell, so newcomers couldn't reach Practice mode).
  Fixed + verified locally; **committed, pending deploy.**

**Verification:**
- 94 unit tests green; `npm run verify` (typecheck/lint/test/build) passes.
- In-browser: create/unlock/lock, receive on both networks, backup quiz,
  watch-only import, live tx detail page, real testnet4 faucet receive
  (coinfaucet.eu) confirmed on the deployed site.

**Status:** LIVE at satchel-wallet.vercel.app. Core wallet functional on
mainnet + testnet4.

**Next session priorities:**
- Push ENH-001 (onboarding toggle) to deploy.
- User completes the testnet4 send + fee-bump smoke test (needs faucet coins).
- FEAT-001 (faucet button), then FEAT-002 (CPFP "Speed up").
