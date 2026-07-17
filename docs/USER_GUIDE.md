# Satchel — User Guide

Last Updated: 2026-07-17

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

### Restoring or first unlock — why Home can take a minute

After you import a seed (or unlock and switch to a network that hasn't been
checked yet), Satchel **looks up past addresses one by one** on a public
blockchain data service. It has to do that to find any coins you've received
before — even if the balance turns out to be zero.

- A **blank or spinning balance is not a wipe.** Your coins are on the
  Bitcoin network; Satchel is still checking.
- You'll see **how many addresses have been checked**, and if any coins are
  found early you'll see a **“balance so far”** that grows as the search
  continues.
- **Mainnet** is often slower than Practice mode (more traffic on the free
  public API). Give it up to a minute or two the first time.
- Later visits on the same device are much faster — Satchel remembers what it
  already found.

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
In Practice mode, the Receive screen has a **Get free practice coins** button.
Tapping it copies your address and opens a faucet site — just paste, and the
coins arrive in your wallet within a minute or so. Faucets are community-run
and occasionally empty; if one errors, search for another testnet4 faucet and
paste the same address there.

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

**A payment you sent:** on **History**, a pending outgoing payment shows a
**Bump fee** button. Tap it, choose a higher rate, and Satchel rebroadcasts
the same payment at the new fee (the recipient still gets the exact same
amount). This uses "Replace-by-Fee" (RBF), which Satchel enables on every send
by default.

**A payment you're waiting to receive:** you can't change someone else's
transaction, but you can still hurry it along. A pending incoming payment
shows a **Speed up** button — Satchel attaches a tiny transaction of your own
that pays extra fee, and miners confirm the two together. You pay only the
boost. If the sender cancels or replaces their payment first, your boost
simply becomes void — you can't lose money trying. (Bitcoiners call this
"child pays for parent," but you don't need to remember that.)

Practice tip: send yourself a payment at the **Slow** fee in Practice mode,
then try both buttons — it's the best way to learn fees with zero stakes.

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

- **Balance spinning / “Looking for your coins…”?** Normal on first check of a
  network (import, unlock, or switching Mainnet ↔ Practice). Satchel walks
  past receive and change addresses to find history. Watch the address counter;
  if funds appear partway through, the total is labeled **balance so far**
  until the search finishes. This is *not* your money disappearing.
- **Balance still empty after the search finishes?** Confirm you're on the
  right network (Mainnet vs Practice), that this is the same seed you funded,
  and that payments were sent to addresses from this wallet. Practice and
  Mainnet balances never mix.
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
