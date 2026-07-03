# Satchel — Backlog

Last Updated: 2026-07-03

Tracks defects, enhancements, and features through their lifecycle. Priorities:
Critical / High / Medium / Low. Detailed scoping for priority items follows the
tables. Longer-term vision lives in [ROADMAP.md](ROADMAP.md).

## Defects & enhancements

| ID | Type | Title | Priority | Status |
|----|------|-------|----------|--------|
| ENH-001 | Enhancement | Network/Practice toggle unreachable on onboarding | Medium | Fixed (pending deploy) |

## Features (open)

| ID | Type | Title | Priority | Status |
|----|------|-------|----------|--------|
| FEAT-001 | Feature | "Get practice coins" faucet button | High | Open |
| FEAT-002 | Feature | CPFP — "Speed up" an incoming pending payment | High | Open |
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

**FEAT-001 — Faucet button.** Hook exists: `faucetUrl` in
`src/lib/networks.ts` (null in v1); the receive screen already renders a
"Get practice coins" button when it's set. Set it to a reliable testnet4
faucet (coinfaucet.eu worked during testing; faucet.testnet4.dev was down).
If the faucet accepts a prefilled address query param, deep-link with the
current receive address. Plain outbound link, no server. Low effort.

**FEAT-002 — CPFP.** Completes the fee story (RBF pushes your own sends; CPFP
pulls a *received* payment forward — you can't RBF a tx you didn't create).
UX: a "Speed up" button on a pending incoming tx; hide the jargon until tapped.
Package fee math: `child_fee = target_rate × (parent_vsize + child_vsize) −
parent_fee`, floored non-negative; parent size/fee from the mempool API.
Deliberately spends an unconfirmed output (a conscious exception to the
"don't spend unconfirmed receives" rule). Sibling to `src/lib/wallet/bump.ts`
(`planCpfp`); reuses UTXO tracking, "yours"-output detection, PSBT + fee code.
~1 focused day with tests. Edge: if an untrusted sender RBF-replaces the
parent, the child dies harmlessly — warn for real received payments.

**FEAT-003 — Throwaway practice wallet.** Because the same seed backs both the
real and practice sides (coin type 0' vs 1'), a true beginner practicing on
their real seed's testnet branch could pick up sloppy habits that endanger
real funds once mainnet is funded. Offer an option to generate a separate
random seed with no link to the real one, purely for learning.

## Completed

| ID | Type | Title | Completed |
|----|------|-------|-----------|
| — | Milestone | M1 — crypto core (@scure/@noble), 66 vector tests | 2026-07-03 |
| — | Milestone | M2 — encrypted vault + keyring session lifecycle | 2026-07-03 |
| — | Milestone | M3 — onboarding, backup quiz, receive, API client, scanner | 2026-07-03 |
| — | Milestone | M4 — dashboard, history, slim explorer, watch-only | 2026-07-03 |
| — | Milestone | M5 — send flow + RBF fee bump | 2026-07-03 |
| — | Milestone | M6 — settings, PWA, offline persistence, CSP | 2026-07-03 |
| — | Deploy | Live at satchel-wallet.vercel.app (mainnet + testnet4) | 2026-07-03 |
