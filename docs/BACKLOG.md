# Satchel — Backlog

Last Updated: 2026-07-03

Tracks defects, enhancements, and features through their lifecycle. Priorities:
Critical / High / Medium / Low. Detailed scoping for priority items follows the
tables. Longer-term vision lives in [ROADMAP.md](ROADMAP.md).

## Defects & enhancements

| ID | Type | Title | Priority | Status |
|----|------|-------|----------|--------|
| ENH-001 | Enhancement | Network/Practice toggle unreachable on onboarding | Medium | Done (deployed) |
| ENH-002 | Enhancement | Merge TEST_PLAN into USE_CASE_CATALOG (8-doc standard) | Low | Done |

## Features (open)

| ID | Type | Title | Priority | Status |
|----|------|-------|----------|--------|
| FEAT-003 | Feature | Throwaway practice-only wallet (separate seed) | Medium | Open |
| FEAT-004 | Feature | BIP86 taproot receive (enable `p2tr` in UI) | Low | Open |
| FEAT-005 | Feature | Address labels / contacts / notes | Medium | Open |
| FEAT-006 | Feature | Hardware wallet signing (Ledger/Trezor) | Medium | Open |
| FEAT-007 | Feature | Biometric / passkey unlock (WebAuthn) | Low | Open |
| FEAT-008 | Feature | WebSocket live updates (replace 30 s polling) | Low | Open |
| FEAT-009 | Feature | Raw-tx broadcast & decode developer tool | Low | Open |
| FEAT-010 | Feature | Lightning support | Low | Deferred (out of v1 scope) |
| FEAT-011 | Feature | Full blocks browser | Low | Won't do (link to mempool.space) |

## Priority item notes

**FEAT-003 — Throwaway practice wallet.** Because the same seed backs both the
real and practice sides (coin type 0' vs 1'), a true beginner practicing on
their real seed's testnet branch could pick up sloppy habits that endanger
real funds once mainnet is funded. Offer an option to generate a separate
random seed with no link to the real one, purely for learning.

## Completed

| ID | Type | Title | Completed |
|----|------|-------|-----------|
| FEAT-001 | Feature | "Get free practice coins" faucet button (copies address on tap) | 2026-07-03 |
| FEAT-002 | Feature | CPFP — "Speed up" a pending incoming payment (`planCpfp` + dialog, 11 tests) | 2026-07-03 |
| — | Milestone | M1 — crypto core (@scure/@noble), 66 vector tests | 2026-07-03 |
| — | Milestone | M2 — encrypted vault + keyring session lifecycle | 2026-07-03 |
| — | Milestone | M3 — onboarding, backup quiz, receive, API client, scanner | 2026-07-03 |
| — | Milestone | M4 — dashboard, history, slim explorer, watch-only | 2026-07-03 |
| — | Milestone | M5 — send flow + RBF fee bump | 2026-07-03 |
| — | Milestone | M6 — settings, PWA, offline persistence, CSP | 2026-07-03 |
| — | Deploy | Live at satchel-wallet.vercel.app (mainnet + testnet4) | 2026-07-03 |
