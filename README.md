# Satchel

**A self-custodial Bitcoin wallet that carries your sats.** Keys are created on
your device, encrypted with your password, and never leave it. Live at
<https://satchel-wallet.vercel.app>.

## For users
Create a wallet in seconds, or import a seed phrase or an xpub (watch-only).
Send and receive on-chain, control fees (with one-tap RBF fee bumping), and
learn risk-free in **Practice mode** with free testnet coins. See the
[User Guide](docs/USER_GUIDE.md).

## For developers
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest — BIP vectors, vault, coin selection, PSBT
npm run verify     # typecheck + lint + test + build (pre-push gate)
```
No backend, no database, no env vars. The only network dependency is the
public mempool.space REST API (keyless). Deploy: `git push origin HEAD:main`
→ Vercel auto-deploys.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 ·
`@scure`/`@noble` crypto (no polyfills) · Zustand · TanStack Query · PWA.

```
src/lib/bitcoin/   pure crypto core (derivation, addresses, fees, coin select, PSBT)
src/lib/vault/     encrypted vault + in-memory keyring (security core)
src/lib/api/       mempool.space client (typed, paced, retrying)
src/lib/wallet/    scanner, history, send/bump orchestration
src/stores/        zustand: settings, wallet metadata, lock status (no secrets)
src/hooks/         TanStack Query data hooks (network-namespaced keys)
src/app/           App Router UI (all wallet pages client-side)
```

## Documentation (`/docs`) — living documents
Kept current on every change (see the protocol in [docs/CLAUDE.md](docs/CLAUDE.md)).

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](docs/CLAUDE.md) | Project intelligence for AI assistants; API verification table; patterns & gotchas |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | End-user walkthrough of every flow |
| [USE_CASE_CATALOG.md](docs/USE_CASE_CATALOG.md) | Every user-facing use case (UC-###) with its embedded verification (happy path + edge cases) |
| [testnet-checklist.md](docs/testnet-checklist.md) | Manual testnet4 E2E checklist |
| [BACKLOG.md](docs/BACKLOG.md) | Defects, enhancements, features (status-tracked) |
| [ROADMAP.md](docs/ROADMAP.md) | Phased vision |
| [PROGRESS.md](docs/PROGRESS.md) | Session log + current status |
| [MEMORY.md](docs/MEMORY.md) | Cross-session decisions, architecture, gotchas |

## Security in one paragraph
One app password → scrypt (N=2¹⁶) → AES-256-GCM vault in IndexedDB holding
every hot-wallet seed. On unlock, only account-level keys are derived into a
module closure; the seed is wiped immediately. Watch-only keys are public data
and stored unencrypted. **Your seed phrase is the only real backup — write it
on paper.**
