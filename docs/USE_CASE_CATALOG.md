# Satchel — Use Case Catalog

Last Updated: 2026-07-03

Every user-facing flow in Satchel. IDs are stable; add new rows, don't renumber.

| UC-ID | Actor | Title | Description |
|-------|-------|-------|-------------|
| UC-001 | New user | Create a new wallet | Generate a 12/24-word BIP39 wallet, set an app password, land on the dashboard with a backup reminder |
| UC-002 | User | Import from seed phrase | Restore an existing wallet by typing its 12/24 words (live BIP39 validation), optional passphrase; runs a gap-limit restore scan |
| UC-003 | User | Import watch-only | Paste an xpub/zpub/tpub/vpub or `wpkh()` descriptor to follow a wallet's balance/history without keys; auto-detects network |
| UC-004 | User | Back up seed phrase | Password-gated reveal of the seed, then a 3-word verification quiz; clears the backup nag when passed |
| UC-005 | User | Unlock wallet | Enter the app password to decrypt the vault and load account keys into memory |
| UC-006 | User | Auto-lock | Wallet locks after idle timeout, on tab-hide (configurable), and on page-hide; keys wiped from memory |
| UC-007 | User | Switch network / Practice mode | Toggle mainnet ↔ testnet4; practice mode re-themes teal and labels amounts tBTC. Available on onboarding and in-app |
| UC-008 | User | View balance | See confirmed + pending balance, toggle BTC/sats, fiat value (mainnet only), pending indicator |
| UC-009 | User | Receive | Show current unused address as QR + text, copy, optionally request a specific amount (BIP21) |
| UC-010 | User | Rotate receive address | Advance to a fresh receive address (auto after use, or manual "New address"), with gap-limit guard |
| UC-011 | User | Send bitcoin | Enter recipient (validated), amount, pick a fee preset or custom rate, review, sign, broadcast; RBF on by default |
| UC-012 | User | Send max | Sweep the full spendable balance to one recipient minus fee, no change output |
| UC-013 | User | Paste/scan payment request | Fill the send form from a `bitcoin:` BIP21 URI (paste) or a camera QR scan |
| UC-014 | User | Bump fee (RBF) | Replace a stuck unconfirmed outgoing tx with a higher-fee version; recipient amount unchanged |
| UC-015 | User | View history | See all incoming/outgoing/self transactions, pending vs confirmed, fiat at current price |
| UC-016 | User | View transaction detail | Slim explorer: status/confirmations, fee, fee rate, size, inputs/outputs with "yours" badges, link out to mempool.space |
| UC-017 | User | View address detail | Slim explorer: any address's balance, tx count, and recent activity |
| UC-018 | User | Manage multiple wallets | Add additional hot/watch wallets under one password; switch the active wallet |
| UC-019 | User | Show / export account xpub | Reveal the account extended public key (QR + copy) to set up watch-only elsewhere |
| UC-020 | User | Change password | Re-encrypt the vault under a new app password (requires the current one) |
| UC-021 | User | Configure display & security | Set fiat currency, BTC/sats default, auto-lock timeout, and tab-hide lock behavior |
| UC-022 | User | Remove a wallet | Delete a single wallet's keys/metadata from the device (password-gated for hot wallets) |
| UC-023 | User | Forgot password / wipe | Erase the vault (typed "WIPE" confirmation) and restore from seed phrase |
| UC-024 | User | Install & use offline (PWA) | Install to home screen; view last-known balance/history offline (send disabled offline) |
| UC-025 | Watch-only user | View without unlocking | Browse a watch-only wallet's balance and history with no password (public data) |
