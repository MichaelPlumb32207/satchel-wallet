# Satchel

**A self-custodial Bitcoin wallet that carries your sats.** Keys are created
on your device, encrypted with your password, and never leave it.

Satchel is a Next.js PWA — a rewrite of the earlier `bitpoc-ui` proof of
concept with a security-first architecture and a UX people actually enjoy.

## Highlights

- **Self-custody, for real**: BIP39/BIP84 HD wallet; scrypt + AES-256-GCM
  encrypted vault in IndexedDB; decrypted keys live only in a module closure,
  wiped on lock; auto-lock on idle / tab-hide / page-hide.
- **Watch-only wallets**: follow any xpub/zpub/vpub or simple `wpkh()`
  descriptor (e.g. your hardware wallet) — viewable without unlocking.
- **Practice mode**: one tap switches to testnet4 with a distinct teal theme.
  Learn with free coins before touching real money.
- **A send flow with guardrails**: live address validation with network-
  mismatch detection, BIP21 URIs, camera QR scanning, live fee presets from
  the mempool, MAX send, RBF on by default with one-tap fee bumping.
- **Slim built-in explorer**: transaction and address pages, with
  mempool.space one click away.
- **No backend**: the only network dependency is the public mempool.space
  REST API (rate-limit-aware client). Prices via mempool.space, mainnet only.
- **Tested where it counts**: the crypto core (derivation, addresses, fees,
  coin selection, PSBT signing, vault encryption) is unit-tested against
  published BIP39/BIP84/BIP86/SLIP-132 test vectors.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest — BIP vectors, vault, coin selection, PSBT
npm run verify     # typecheck + lint + test + build (pre-push gate)
```

Manual E2E: [docs/testnet-checklist.md](docs/testnet-checklist.md).

## Architecture

```
src/lib/bitcoin/   pure crypto core (@scure/@noble stack, no Node polyfills)
src/lib/vault/     encrypted vault + in-memory keyring (the security core)
src/lib/api/       mempool.space client (typed, paced, retrying)
src/lib/wallet/    scanner, history classification, send/bump orchestration
src/stores/        zustand: settings, wallet metadata, lock status (no secrets)
src/hooks/         TanStack Query data hooks (network-namespaced cache keys)
src/app/           Next.js App Router UI (all wallet pages client-side)
```

Security model in brief: one app password → scrypt (N=2^16) → AES-256-GCM
vault holding every hot-wallet seed. On unlock, only account-level xprvs are
derived into a module closure; the seed is wiped immediately. Watch-only
keys are public data and stored unencrypted. **Your seed phrase is the only
real backup — write it on paper.**
