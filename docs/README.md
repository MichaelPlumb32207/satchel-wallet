# Satchel — Documentation Index

Last Updated: 2026-07-17

The product overview and developer quick-start live in the
[root README](../README.md). This folder holds the **eight living documents**,
kept current on every change per the mandatory protocol (see
[CLAUDE.md](CLAUDE.md)).

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Authoritative project intelligence for AI assistants; API verification table; patterns, gotchas, protocol |
| [USER_GUIDE.md](USER_GUIDE.md) | End-user walkthrough of every flow |
| [USE_CASE_CATALOG.md](USE_CASE_CATALOG.md) | Every user-facing use case (`UC-###`) with embedded verification (happy path + edges + core coverage) |
| [testnet-checklist.md](testnet-checklist.md) | Manual testnet4 end-to-end checklist |
| [BACKLOG.md](BACKLOG.md) | Defects, enhancements, features (status-tracked) |
| [ROADMAP.md](ROADMAP.md) | Phased vision and priorities |
| [PROGRESS.md](PROGRESS.md) | Session log and current status |
| [MEMORY.md](MEMORY.md) | Cross-session decisions, architecture, gotchas |

**Protocol (every change):** implement → read/update all eight docs (even to
confirm "no change required"), matching each doc's format → commit and push to
`main` (Vercel auto-deploys). USE_CASE_CATALOG.md holds its own verification —
there is no separate test-plan doc.
