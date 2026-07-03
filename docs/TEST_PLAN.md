# Satchel — Test Plan

Last Updated: 2026-07-03

## Strategy

- **Unit (automated):** Vitest, 94 tests over the pure crypto/wallet core —
  the highest-risk code. Run with `npm test`. Coverage: BIP39/BIP84/BIP86
  derivation vs published vectors, address validation + network-mismatch,
  SLIP-132 conversion, BIP21 parse/build, fee/vsize tables, coin selection,
  PSBT sign/finalize + RBF, vault encrypt/decrypt/tamper.
- **E2E (manual):** testnet4 walkthrough — see
  [testnet-checklist.md](testnet-checklist.md). Practice mode uses free
  faucet coins, so the full send/receive/bump loop is exercised with zero risk.
- **Pre-push gate:** `npm run verify` = typecheck → lint → test → `next build`.
  Stop on first failure.

## Test Cases

Automated cases live in `src/**/*.test.ts`; the table below is the acceptance
matrix (A = automated, M = manual). TC rows cross-reference use cases.

| TC-ID | UC-ID | Type | Description | Expected |
|-------|-------|------|-------------|----------|
| TC-001 | — | A | BIP84 derivation vs vector (`abandon…about`) | First receive = `bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu` |
| TC-002 | — | A | Change chain derives `/1/0` | Matches published change address; not a receive address |
| TC-003 | — | A | testnet4 derivation | Coin type 1', addresses start `tb1q` |
| TC-004 | — | A | BIP86 taproot vectors | Matches published `bc1p…` addresses (feature-flagged off in UI) |
| TC-005 | UC-003 | A | Watch-only xpub derives same addresses; refuses private keys | Same addresses; signing throws "watch-only" |
| TC-006 | UC-011 | A | Address validation + network mismatch | Valid types classified; testnet addr on mainnet → wrong-network |
| TC-007 | UC-011 | A | Fee/vsize table vs real signed tx | 1-in-2-out P2WPKH = 141 vB |
| TC-008 | UC-011 | A | Coin selection (effective value, dust-to-fee, insufficient) | Uneconomic UTXOs skipped; sub-dust change → fee |
| TC-009 | UC-011 | A | PSBT build/sign/finalize + RBF sequence | Decodes, final, sequence `0xfffffffd` |
| TC-010 | UC-005 | A | Vault encrypt/decrypt roundtrip, wrong password, tamper | Roundtrips; wrong pw + tampered ciphertext both reject |
| TC-011 | UC-001 | M | Create wallet + set password | Lands on dashboard, backup nag shown |
| TC-012 | UC-004 | M | Backup reveal + quiz | Password-gated; passing quiz clears nag |
| TC-013 | UC-002 | M | Import seed + restore scan | Existing balance/history found |
| TC-014 | UC-003 | M | Import watch-only xpub | Auto-switches network, balance shown, send disabled |
| TC-015 | UC-007 | M | Toggle Practice mode (onboarding + in-app) | Teal theme, banner, tBTC labels |
| TC-016 | UC-009 | M | Receive faucet coins | Address QR shown; payment appears pending in ~30 s |
| TC-017 | UC-011 | M | Send at each fee preset | Fee sat/vB matches preset; broadcasts; pending |
| TC-018 | UC-012 | M | Send max | Full balance minus fee; no change output |
| TC-019 | UC-014 | M | Bump a stuck send | Low-fee send replaced at higher rate; recipient amount unchanged |
| TC-020 | UC-006 | M | Auto-lock fires; unlock restores | Locks on idle/hide; correct password unlocks |
| TC-021 | UC-023 | M | Wipe + restore | "WIPE" erases vault; seed restores same wallet |
| TC-022 | UC-024 | M | PWA install + offline | Installable; offline shows cached balance under banner; send disabled |
| TC-023 | UC-016 | M | Tx detail on live site | Status/fee/inputs/outputs render; "yours" tags correct output |

## Known verification gaps

- Live send/bump on testnet4 depends on faucet coins (user smoke test).
- mempool.space public API throttles request bursts; heavy restore scans can
  transiently rate-limit the browser's IP (see
  [MEMORY.md](MEMORY.md) — mitigated by request pacing).
