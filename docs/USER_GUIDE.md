# Satchel — User Guide

Last Updated: 2026-07-03

Satchel is a Bitcoin wallet that lives in your browser. Your keys are made on
your device and locked with your password — no company holds your money, and
no account or email is required. This guide walks through everything.

> **The golden rule:** your **seed phrase** (the 12 or 24 words) is the master
> key to your money. Write it on paper, keep it private, and never type it into
> any website or app that asks for it. Satchel will only ever show it to you
> during backup, after your password.

## 1. Getting started

When you first open Satchel you'll choose one of three paths:

- **Create a new wallet** — fresh keys, ready in seconds.
- **I have a seed phrase** — restore a wallet from its 12/24 words.
- **Watch-only** — follow a wallet's balance using its public key (xpub),
  without the ability to spend.

## 2. Practice mode (learn risk-free)

Bitcoin has a free "practice" network called **testnet4**. Tap **Mainnet** in
the top-right (or "Try Practice mode" on the welcome screen) to switch — the
app turns teal and amounts show as **tBTC**. These coins are worthless and free
from faucets, so you can learn the whole app with zero risk, then switch back
to real Bitcoin when you're ready.

Good to know: your same wallet works on both sides. The words back up both;
one side is real, one is practice, and they never mix.

## 3. Set your password & back up

- **Password:** encrypts your keys on this device. It can't be recovered — but
  your wallet always can be, from the seed phrase.
- **Backup:** open **Back up your wallet** (from the banner or Settings).
  Enter your password, write the words on paper in order, then pass the quick
  3-word quiz. Don't screenshot the words — screenshots sync to the cloud.

## 4. Receiving bitcoin

Go to **Receive**. You'll see your current address as a QR code and text.
- **Copy** the address or let someone scan the QR.
- Optionally enter an amount to request (this builds a payment link).
- Tap **New address** for a fresh one — using a new address per payer keeps
  your history private.

Incoming payments appear on **Home** as *pending* within about 30 seconds, then
confirm once a miner includes them in a block.

### Getting practice coins
In Practice mode, get free testnet4 coins from a faucet (e.g.
coinfaucet.eu/en/btc-testnet4), pasting your `tb1…` receive address. Faucets
are often busy or empty — if one errors, just try another.

## 5. Sending bitcoin

Go to **Send** (three quick steps):
1. **Recipient** — paste or scan an address, or paste a `bitcoin:` payment
   link. Satchel checks it live and warns if it's for the wrong network.
2. **Amount & fee** — enter an amount (or tap **MAX** to send everything), then
   pick a fee: **Fast / Normal / Slow** (with estimated time and cost) or a
   custom rate.
3. **Confirm** — review recipient, amount, fee, and total, then **Send now**.

You'll get a link to the transaction. It shows as *pending* until it confirms.

> Satchel won't spend coins you just *received* until they confirm — a safety
> rule. If Send says "no confirmed coins yet," give it a block.

## 6. If a payment gets stuck

Sent a transaction with too low a fee? On **History**, a pending outgoing
payment shows a **Bump fee** button. Tap it, choose a higher rate, and Satchel
rebroadcasts the same payment at the new fee (the recipient still gets the
exact same amount). This uses "Replace-by-Fee" (RBF), which Satchel enables on
every send by default.

## 7. History & details

**History** lists every payment in and out, pending or confirmed, with its
value. Tap any transaction to see full details — fee, confirmations, and every
input/output (your own are tagged **yours**). "View on mempool.space" opens the
public explorer.

## 8. Settings

- **Network:** switch between Mainnet and Practice.
- **Display:** choose your fiat currency and whether to show BTC or sats.
- **Security:** set the auto-lock timer and what happens when you switch tabs;
  change your password.
- **Show xpub:** reveal your account public key (to set up watch-only on
  another device). This reveals your balance and history but can never spend.
- **Danger zone:** remove a wallet, or erase everything from this device.

## 9. Locking & unlocking

Satchel locks automatically when you're idle or leave the tab, and whenever you
reload. Unlock with your password. Watch-only wallets don't need unlocking —
they hold no keys.

## 10. Installing the app (PWA)

From your browser's menu, choose **Install** / **Add to Home Screen**. Satchel
then runs like a native app and shows your last-known balance even offline
(sending requires a connection).

## 11. If you forget your password

There's no reset — but there's no lock-out either. On the unlock screen choose
**Forgot password**, type **WIPE** to erase the wallet, then restore it from
your seed phrase. This is exactly why the seed backup matters: it's your
recovery for a lost password *and* a lost device.

## 12. Troubleshooting

- **Balance slow to load?** The public data service throttles heavy use; give
  it a moment. A fresh wallet loads instantly.
- **Faucet won't pay?** It's the faucet (often drained), not your address — try
  a different one.
- **"Wrong network" when sending?** You're on Mainnet trying to pay a testnet
  address (or vice versa). Switch networks or check the address.
- **Send disabled?** Either you're on a watch-only wallet, you're offline, or
  your only coins are still unconfirmed.

## Safety reminders
- Your seed phrase = your money. Paper only, private, never typed into a website.
- No legitimate faucet or service ever needs your seed phrase.
- Practice with free coins first; move to real Bitcoin when you're comfortable.
