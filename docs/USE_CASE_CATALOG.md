# Satchel — Use Case Catalog

Last Updated: 2026-07-17

Use cases with embedded verification. Each use case describes a flow (its happy
path) and carries its own acceptance tests directly beneath it — happy path
plus edge cases and validations — so the spec and its verification never drift
apart. Lower-level tests that back many use cases at once live under
**Automated core coverage**.

## Testing strategy
- **Automated (A):** Vitest over the pure crypto/wallet core — the highest-risk
  code. `npm test` (110 tests). Referenced per use case and enumerated under
  Automated core coverage.
- **Manual (M):** testnet4 walkthrough in Practice mode with free faucet coins;
  step-by-step list in [testnet-checklist.md](testnet-checklist.md).
- **Pre-push gate:** `npm run verify` = typecheck → lint → test → `next build`,
  stop on first failure.

Test IDs are anchored to their use case: `UC-###·H` = happy path,
`UC-###·E#` = edge/validation. **Type** is A (automated) or M (manual).

---

## Onboarding & keys

### UC-001 — Create a new wallet
**Actor:** New user · **Happy path:** Generate a 12/24-word BIP39 wallet, set an
app password, land on the dashboard with a backup reminder.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-001·H | M | Create → 12 words → set password → continue | Lands on dashboard; backup nag shown |
| UC-001·E1 | M | Password under 8 chars | Blocked with "at least 8 characters" |
| UC-001·E2 | M | Password ≠ confirmation | Blocked with "passwords don't match" |
| UC-001·E3 | M | Create a 2nd wallet when a vault already exists | Prompted for existing password, not a new one |

### UC-002 — Import from seed phrase
**Actor:** User · **Happy path:** Restore by typing 12/24 words (live BIP39
validation), optional passphrase; a gap-limit restore scan finds prior activity.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-002·H | M | Enter a valid 12-word phrase → import | Restore scan runs; existing balance/history appear |
| UC-002·E1 | M | Non-BIP39 word in the phrase | Flagged inline; import disabled |
| UC-002·E2 | M | Valid words, bad checksum / wrong order | "Checksum doesn't match"; import disabled |
| UC-002·E3 | M | Wrong word count (e.g. 13) | "a seed phrase has 12 or 24"; import disabled |
| UC-002·E4 | M | Extra whitespace / mixed case | Normalized and accepted |

### UC-003 — Import watch-only
**Actor:** User · **Happy path:** Paste an xpub/zpub/tpub/vpub or `wpkh()`
descriptor to follow a wallet without keys; network auto-detected.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-003·H | M | Paste a mainnet zpub | Auto-switches to mainnet; balance/history load |
| UC-003·E1 | A | xpub derives the same addresses as the private node | Addresses match; signing throws "watch-only" |
| UC-003·E2 | M | Paste an xprv (private key) | Rejected with a "never share it" warning |
| UC-003·E3 | M | Paste a ypub (nested segwit) or garbage | Clear "not supported / not recognized" error |
| UC-003·E4 | M | Send from a watch-only wallet | Send is disabled |

### UC-004 — Back up seed phrase
**Actor:** User · **Happy path:** Password-gated reveal, then a 3-word
verification quiz; clears the backup nag when passed.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-004·H | M | Reveal → write down → pass the 3-word quiz | Nag cleared; wallet marked backed up |
| UC-004·E1 | M | Wrong password at reveal | Rejected; words not shown |
| UC-004·E2 | M | Fail the quiz | Returns to the words; not marked verified |

## Session & security

### UC-005 — Unlock wallet
**Actor:** User · **Happy path:** Enter the app password to decrypt the vault
and load account keys into memory.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-005·H | M | Correct password on the lock screen | Unlocks to the dashboard |
| UC-005·E1 | M | Wrong password | "Wrong password"; stays locked |
| UC-005·E2 | A | Vault decrypt with wrong password / tampered blob | Both reject (AES-GCM auth); never returns garbage |

### UC-006 — Auto-lock
**Actor:** User · **Happy path:** Locks after idle timeout, on tab-hide
(configurable), and on page-hide; keys wiped from memory.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-006·H | M | Idle past the configured timeout | Locks; unlock required |
| UC-006·E1 | M | Reload the page | Re-locks (hot wallet) |
| UC-006·E2 | M | Switch active wallet to watch-only, then reload | Viewable without unlocking |

### UC-023 — Forgot password / wipe
**Actor:** User · **Happy path:** Erase the vault (typed "WIPE" confirmation)
and restore from the seed phrase.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-023·H | M | Forgot password → type WIPE → restore from seed | Vault erased; seed restores the same wallet |
| UC-023·E1 | M | Confirmation text ≠ "WIPE" | Erase button stays disabled |
| UC-023·E2 | M | Wipe with a watch-only wallet also present | Hot wallet removed; watch-only survives |

## Receive

### UC-009 — Receive
**Actor:** User · **Happy path:** Show the current unused address as QR + text,
copy, optionally request a specific amount (BIP21).

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-009·H | M | Open Receive; send faucet coins to the address | Address QR shown; payment appears pending in ~30 s |
| UC-009·E1 | A | Build/parse a BIP21 URI with amount + label | Round-trips exactly |
| UC-009·E2 | M | Watch-only wallet on the wrong network | "Switch network" notice instead of an address |

### UC-010 — Rotate receive address
**Actor:** User · **Happy path:** Advance to a fresh receive address (auto after
use, or manual "New address"), with a gap-limit guard.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-010·H | M | Tap "New address" | A different unused address is shown |
| UC-010·E1 | M | Rotate near the gap limit | Warning about restore-scan visibility |

### UC-026 — Get practice coins from a faucet
**Actor:** Learner (Practice mode) · **Happy path:** Tap **Get free practice
coins** on Receive; the current address is copied and a verified testnet4
faucet opens in a new tab — paste, and coins arrive as a pending payment.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-026·H | M | Tap the button in Practice mode | Faucet opens in a new tab; "Address copied" hint shows; pasted address receives coins |
| UC-026·E1 | M | Same screen on Mainnet | No faucet button rendered |
| UC-026·E2 | M | Clipboard permission denied | Faucet still opens; user copies the address manually from the card above |

## Send

### UC-011 — Send bitcoin
**Actor:** User · **Happy path:** Enter a validated recipient, amount, pick a fee
preset or custom rate, review, sign, broadcast; RBF on by default.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-011·H | M | Valid address, amount, Normal fee, confirm | Signs, broadcasts, pending; tx link shown |
| UC-011·E1 | A/M | Testnet address while on mainnet (or vice versa) | "Wrong network" error; send blocked |
| UC-011·E2 | A | Inputs can't cover amount + fee | "Short by N sats" |
| UC-011·E3 | M | Paste a `bitcoin:` URI | Recipient + amount prefilled |
| UC-011·E4 | A | Amount below the dust limit for the address type | Rejected |
| UC-011·E5 | M | Try to spend only just-received unconfirmed coins | Blocked ("no confirmed coins yet") by design |
| UC-011·E6 | A | Signed tx decodes; RBF sequence set; vsize ≤ estimate | Final, `0xfffffffd`, 1-in-2-out = 141 vB |

### UC-012 — Send max
**Actor:** User · **Happy path:** Sweep the full spendable balance to one
recipient minus fee, no change output.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-012·H | M | Tap MAX → confirm | Recipient gets total − fee; tx detail shows no change output |
| UC-012·E1 | A | Balance too small to cover the fee | "Nothing to send / too small after fees" |

### UC-013 — Paste / scan payment request
**Actor:** User · **Happy path:** Fill the send form from a BIP21 URI (paste) or
a camera QR scan.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-013·H | M | Scan a receive QR | Recipient (and amount, if present) prefilled |
| UC-013·E1 | A | BIP21 with an unsupported `req-` param | Rejected with a clear message |
| UC-013·E2 | M | Camera permission denied | "Camera unavailable — paste instead" |

### UC-014 — Bump fee (RBF)
**Actor:** User · **Happy path:** Replace a stuck unconfirmed outgoing tx with a
higher-fee version; recipient amount unchanged.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-014·H | M | Bump a 1 sat/vB send to a fast rate | Replacement broadcasts; original superseded; recipient amount identical |
| UC-014·E1 | M | New rate ≤ current rate | Rejected ("must beat current rate") |
| UC-014·E2 | M | Bump shown only on pending, RBF-signaling, own sends | No bump button on received/confirmed txs |

### UC-027 — Speed up a pending incoming payment (CPFP)
**Actor:** User · **Happy path:** A payment someone sent us is stuck at a low
fee. Tap **Speed up** on the pending incoming tx in History, pick a target
rate, preview the boost cost, broadcast — a small self-payment whose fee pulls
the whole package into the next blocks. The one deliberate exception to the
"never spend unconfirmed receives" rule (safe: the child only pays ourselves).

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-027·H | M | Speed up a low-fee incoming faucet payment | Boost broadcasts; both txs confirm together; coins land on our change address |
| UC-027·E1 | A | Package fee math at target rate | `child_fee = target × (parent_vsize + child_vsize) − parent_fee`, exact |
| UC-027·E2 | A | Anchor output too small for the boost | Tops up from confirmed/own-change coins only — never others' unconfirmed |
| UC-027·E3 | A | Target rate ≤ parent's current rate | Rejected ("already pays N sat/vB") |
| UC-027·E4 | A | Parent confirmed / outputs already spent / boost unaffordable | Clear per-case errors; no plan produced |
| UC-027·E5 | A | Boost output goes to our own next free change address | Address matches `m/84'/…/1/next` |
| UC-027·E6 | M | Button visibility | Only on pending incoming txs whose output is still unspent, hot wallets only |

## History & explorer

### UC-015 — View history
**Actor:** User · **Happy path:** See incoming/outgoing/self transactions,
pending vs confirmed, fiat at current price.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-015·H | M | Open History | Txs listed newest-first, pending on top |
| UC-015·E1 | A | Classify in/out/self, net amount, dedupe, ordering | Correct direction + net; deduped; pending first |

### UC-016 — View transaction detail
**Actor:** User · **Happy path:** Status/confirmations, fee, fee rate, size,
inputs/outputs with "yours" badges, link out to mempool.space.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-016·H | M | Open a tx on the live site | Status/fee/size + inputs/outputs render; our output tagged "yours" |
| UC-016·E1 | M | Unknown / not-found txid | "Transaction not found on <network>" |

### UC-017 — View address detail
**Actor:** User · **Happy path:** Any address's balance, tx count, and recent
activity.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-017·H | M | Open an address page | Balance, tx count, recent activity shown |
| UC-017·E1 | M | Address with 25+ txs | "Showing most recent…" note; link out for full history |

## Wallet & settings

### UC-007 — Switch network / Practice mode
**Actor:** User · **Happy path:** Toggle mainnet ↔ testnet4; practice re-themes
teal and labels amounts tBTC. Available on onboarding and in-app.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-007·H | M | Tap the network pill (onboarding or header) | Theme flips teal/orange; tBTC/BTC labels update; banner in practice |
| UC-007·E1 | M | Switch network with a wallet loaded | Same wallet, different addresses/balance; caches isolated |

### UC-008 — View balance
**Actor:** User · **Happy path:** Confirmed + pending balance, BTC/sats toggle,
fiat (mainnet only), pending indicator.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-008·H | M | Open Home with funds | Balance + fiat shown; tap toggles BTC/sats |
| UC-008·E1 | A | sats↔BTC conversion + formatting | Exact (bigint), no float drift |
| UC-008·E2 | M | Practice mode | No fiat shown (worthless by design) |
| UC-008·E3 | M | Cold gap-scan (import / first open on a network) | “Looking for your coins…” + address counter; not a blank panic state |
| UC-008·E4 | M | Coins found mid-scan | Provisional total shown as “Balance so far”; final UTXO sum replaces it when ready |
| UC-008·E5 | A | `balanceFromAddressInfo` | Confirmed = chain funded−spent; pending = mempool funded−spent |

### UC-018 — Manage multiple wallets
**Actor:** User · **Happy path:** Add additional hot/watch wallets under one
password; switch the active wallet.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-018·H | M | Add a 2nd wallet; use the header switcher | Both listed; switching changes balance/history |

### UC-019 — Show / export account xpub
**Actor:** User · **Happy path:** Reveal the account extended public key (QR +
copy) to set up watch-only elsewhere.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-019·H | M | Settings → Show xpub | xpub QR + copy; note that it reveals history but can't spend |
| UC-019·E1 | M | Wallet locked | Prompt to unlock before deriving xpub |

### UC-020 — Change password
**Actor:** User · **Happy path:** Re-encrypt the vault under a new password
(requires the current one).

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-020·H | M | Enter current + new (twice) | Vault re-encrypted; new password unlocks, old fails |
| UC-020·E1 | M | Wrong current password | Rejected |
| UC-020·E2 | M | New password mismatch / too short | Blocked |

### UC-028 — Security & trust (open source + build provenance)
**Actor:** User · **Happy path:** From Settings, open Security & trust; read
self-custody model and threat notes; open the public GitHub repo; on a
production deploy, open the commit link for this build.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-028·H | M | Settings → Security & trust | Page explains keys-on-device, never-do list, threat model, repo link |
| UC-028·E1 | M | Production deploy (Vercel) | Short commit SHA links to matching GitHub commit; version shown |
| UC-028·E2 | M | Local `npm run dev` | Commit shows as `dev` (no deploy SHA); repo link still works |
| UC-028·E3 | A | `getBuildInfo` short SHA | 7-char prefix when full SHA present; `dev` when empty |

### UC-021 — Configure display & security
**Actor:** User · **Happy path:** Set fiat currency, BTC/sats default, auto-lock
timeout, and tab-hide lock behavior.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-021·H | M | Change currency / unit / auto-lock timer | Persists across reloads; applied app-wide |

### UC-022 — Remove a wallet
**Actor:** User · **Happy path:** Delete a single wallet's keys/metadata from
the device (password-gated for hot wallets).

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-022·H | M | Danger zone → remove hot wallet (with password) | Wallet gone; others intact |
| UC-022·E1 | M | Remove a watch-only wallet | No password required (public data) |

### UC-024 — Install & use offline (PWA)
**Actor:** User · **Happy path:** Install to home screen; view last-known
balance/history offline (send disabled offline).

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-024·H | M | Install; go offline; reopen | Cached balance/history under an "offline" banner |
| UC-024·E1 | M | Attempt to send while offline | Sending disabled |

### UC-025 — View watch-only without unlocking
**Actor:** Watch-only user · **Happy path:** Browse a watch-only wallet's
balance/history with no password.

| Test | Type | Scenario | Expected |
|------|------|----------|----------|
| UC-025·H | M | Active wallet is watch-only, app locked | Balance/history viewable; no unlock prompt |

---

## Automated core coverage
Pure-function suites in `src/**/*.test.ts` that underpin many use cases at once
(run via `npm test`). These are the correctness backbone behind the flows above.

| Test | Area | Verifies |
|------|------|----------|
| CORE-01 | Derivation | BIP84 vs published vectors (first receive = `bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu`) |
| CORE-02 | Derivation | Internal change chain `/1/i` (fixes the POC change-to-receive bug); testnet4 `tb1q` |
| CORE-03 | Derivation | BIP86 taproot vectors (feature-flagged off in UI) |
| CORE-04 | Addresses | bech32/bech32m + base58 validation; network-mismatch detection |
| CORE-05 | SLIP-132 | zpub/vpub ↔ xpub/tpub conversion + descriptor parsing |
| CORE-06 | BIP21 | Payment-URI parse/build round-trip; `req-` rejection |
| CORE-07 | Fees | Per-script-type vsize tables (1-in-2-out P2WPKH = 141 vB); dust thresholds |
| CORE-08 | Coin select | Effective-value selection; sub-dust-to-fee; insufficient-funds reporting |
| CORE-09 | PSBT | Build/sign/finalize; RBF sequence; real vsize ≤ estimate |
| CORE-10 | Vault | scrypt + AES-GCM encrypt/decrypt; wrong-password + tamper rejection; version guard |
| CORE-11 | Units | sats↔BTC exactness (bigint), formatting |
| CORE-12 | History | Tx classification (in/out/self), net amounts, dedupe, ordering |
| CORE-13 | Scanner | Gap-limit scan across both chains; progress; stops at the gap |
| CORE-14 | CPFP | `planCpfp` package fee math, relay floor, top-up trust rule, change targeting, error paths (11 tests) |
| CORE-15 | Balance | `balanceFromAddressInfo` confirmed/pending from chain + mempool stats (3 tests) |
| CORE-16 | Build info | `getBuildInfo` short SHA / dev fallback (trust provenance helper) |

## Known verification gaps
- Live send + fee-bump + CPFP speed-up on testnet4 depend on faucet coins
  (user smoke test; UC-027·H not yet run against the network).
- mempool.space public API throttles request bursts; heavy restore scans can
  transiently rate-limit the browser's IP — mitigated by request pacing (see
  [MEMORY.md](MEMORY.md)). Progressive scan UI (ENH-003) reduces the
  panic-inducing blank state but does not make the public API faster.
