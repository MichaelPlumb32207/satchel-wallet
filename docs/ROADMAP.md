# Satchel — Roadmap

Last Updated: 2026-07-17

Longer-term vision and phasing. The itemized, status-tracked list lives in
[BACKLOG.md](BACKLOG.md); this is the "where it's going and why" view.

## Phase 0 — v1 (shipped, 2026-07-03)
A polished, self-custodial on-chain wallet with watch-only support and a
first-class Practice mode. Deployed at satchel-wallet.vercel.app.
Onboarding · encrypted vault + auto-lock · send/receive · RBF fee bump ·
slim explorer · PWA · mainnet + testnet4.

## Phase 1 — Complete the learning loop (in progress)
Make Practice mode genuinely frictionless for a newcomer, and finish the
fee-management story.
- ~~**FEAT-001 — Faucet button.**~~ Shipped 2026-07-03: one tap opens a
  verified faucet with your address already on the clipboard.
- ~~**FEAT-002 — CPFP "Speed up".**~~ Shipped 2026-07-03: RBF handles your own
  stuck sends; CPFP pulls a stuck *received* payment forward. Fee story closed.
- ~~**ENH-003 — Progressive scan UX.**~~ Shipped 2026-07-17: Home shows scan
  progress + “balance so far” during cold loads; USER_GUIDE explains restore.
- ~~**ENH-004 — Security & trust + build provenance.**~~ Shipped 2026-07-17:
  `/security` page + Settings commit link to the exact GitHub revision.
- **FEAT-003 — Throwaway practice wallet.** Let true beginners learn on a seed
  with no connection to real funds. (The remaining Phase 1 item.)

## Phase 2 — Broaden custody & convenience
- **FEAT-006 — Hardware wallet signing.** Watch-only already follows their
  xpubs; add signing (WebUSB/WebHID) so cold-storage users can spend.
- **FEAT-005 — Address labels / contacts.** Everyday usability; also nudges
  good privacy habits.
- **FEAT-007 — Passkey/biometric unlock.** A friendlier alternative to the
  password on supported devices.
- **FEAT-004 — BIP86 taproot receive.** The plumbing is already threaded
  through; flip `p2tr` on when there's demand.

## Phase 3 — Liveness & power tools
- **FEAT-008 — WebSocket live updates.** Replace polling for instant
  confirmations; the `subscribeAddress()` interface is already stubbed.
- **FEAT-009 — Raw-tx broadcast/decode** developer tool.

## Explicitly out / deferred
- **FEAT-010 — Lightning:** large, separate architecture; not planned for the
  on-chain product line.
- **FEAT-011 — Full blocks browser:** mempool.space does it better; we link out.

## Guiding principles
- UX quality is the differentiator, not feature count.
- Never ship anything that puts real keys or funds at avoidable risk; when in
  doubt, make the safe path the default and the risky path explicit.
- Keep the dependency surface tiny (audited crypto libs, no backend).
