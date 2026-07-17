# Satchel — Memory

Last Updated: 2026-07-17

Cross-session knowledge: decisions, architecture, and gotchas that aren't
obvious from the code.

## Documentation
- **Eight living docs** (not nine): `USE_CASE_CATALOG.md` embeds its own
  verification (happy path + edge cases per use case, plus an "Automated core
  coverage" table) — there is no separate `TEST_PLAN.md`. This co-locates spec
  and tests so they can't drift, and is the cross-project standard (ENH-002).

## Product decisions
- **Self-custody + watch-only.** Keys are generated and encrypted client-side,
  never leave the device. Watch-only wallets follow an xpub without keys.
- **Practice mode is first-class.** The mainnet↔testnet4 toggle re-themes the
  app teal and labels amounts tBTC; the goal is risk-free learning on the
  *same* wallet you'll use for real. (Same seed → coin type 0' = real,
  1' = practice; separate branches, never mix.)
- **On-chain only** for v1 (no Lightning).
- **Slim explorer only:** tx + address detail pages; deep-link to
  mempool.space rather than rebuilding a full explorer.
- Name "Satchel" (a satchel carries your sats).

## Architecture
- **Crypto:** `@scure/@noble` stack, not bitcoinjs-lib — audited, pure ESM,
  `Uint8Array` end-to-end, zero polyfills (the POC's biggest tooling pain).
- **Derivation:** BIP84 `m/84'/{0|1}'/0'`, external `/0/i` and internal change
  `/1/i` chains, gap limit 20. `ScriptType` param threads taproot through for
  a future BIP86 flip; only `p2wpkh` exposed in v1.
- **State:** Zustand (`settings`, `wallets` metadata, `session` lock-status) +
  TanStack Query for all mempool.space data. Query keys are namespaced by
  network so a network toggle swaps caches instantly.
- **PWA:** hand-rolled service worker (NOT Serwist — it's a webpack plugin and
  the build uses Turbopack); offline wallet data comes from the Query
  persister in IndexedDB, not the SW.

## Security model
- One app password → scrypt (N=2¹⁶, r=8, p=1) → AES-256-GCM over
  `{wallets:[{mnemonic, passphrase?}]}` in IndexedDB.
- Decrypted material lives ONLY in `src/lib/vault/keyring.ts` (module closure).
  On unlock, derive account-level xprvs then wipe the seed. Lock =
  `wipePrivateData()` + null refs. Zustand/React never hold secrets.
- Watch-only descriptors are public data — stored unencrypted, viewable while
  locked (a feature).
- Honest caveat documented in code: JS can't guarantee zeroization; the real
  boundaries are the KDF and auto-lock.

## Gotchas
- **mempool.space rate limits hard.** Rapid address sweeps (restore scans) get
  CORS-masked failures then hanging/timeouts, cooldown lasting minutes; 429 is
  often NOT returned. Client (`src/lib/api/mempool.ts`) uses max-2 concurrency,
  ~250 ms spacing, 15 s per-attempt timeout, retry-on-network-error backoff.
  Scans run once per session (staleTime Infinity) with explicit invalidation,
  never on a timer.
- **Cold balance load is inherently slow on mainnet.** A never-used wallet still
  probes ~40 addresses (gap 20 × 2 chains) before the dashboard can finish;
  with pacing that is ~10s best-case and much longer under throttle. Users who
  expect coins and see a blank skeleton panic — so Home shows “Looking for your
  coins…”, an address counter, and a provisional “balance so far” accumulated
  from address-info during the scan (`useScanProgress` / `balanceFromAddressInfo`).
  USER_GUIDE §1 and §12 spell this out in plain language.
- **No secrets in env, ever.** Static client app: a `NEXT_PUBLIC_` var ships in
  the bundle. If a feature needs a secret, it must go behind a server route first.
- **Spending unconfirmed:** the send flow refuses to spend unconfirmed coins
  received from others (only own change), by design. CPFP ("Speed up",
  `src/lib/wallet/cpfp.ts`) is the one deliberate exception — safe because the
  child only pays ourselves, and it dies harmlessly if the sender replaces the
  parent. The same trust rule applies to CPFP top-up coins.
- **coinfaucet.eu has no address-prefill query param** — the faucet button
  copies the receive address to the clipboard on tap instead (checked
  2026-07-03; recheck if the faucet ever adds one).

## Infrastructure
- GitHub: MichaelPlumb32207/satchel-wallet (**public** — no secrets in repo)
- Vercel: satchel-wallet.vercel.app (team liberty-concierge), auto-deploy from `main`
- No Neon/database. External API: mempool.space (mainnet + /testnet4), keyless.

## Future considerations
- FEAT-001 (faucet button) and FEAT-002 (CPFP) shipped 2026-07-03 (v0.2.0).
- A throwaway practice-only wallet (FEAT-003) would decouple learning from the
  real seed — the remaining Phase 1 item; see [BACKLOG.md](BACKLOG.md).
