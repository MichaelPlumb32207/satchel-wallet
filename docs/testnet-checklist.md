# Satchel — manual testnet4 E2E checklist

Run this end-to-end on **Practice mode (testnet4)** before any release that
touches wallet logic. Free coins: tap **Get free practice coins** on the
Receive screen (copies your address, opens the faucet); fallback if that
faucet is drained: mempool.space's faucet at
https://mempool.space/testnet4/faucet (requires login).

## Onboarding & backup
- [ ] Create a new wallet (12 words) with a password → lands on Home with backup nag
- [ ] Backup flow: password gate → words shown → quiz (pick 3 words) → nag disappears
- [ ] Failing the quiz on purpose returns to the words, does NOT mark verified
- [ ] Import the same seed in a private/incognito window → restore scan finds the funds

## Receive
- [ ] Receive shows a tb1q… address with QR (practice banner + teal theme visible)
- [ ] "Get free practice coins" opens the faucet in a new tab and shows the
      "Address copied" hint; pasting funds the wallet (button absent on mainnet)
- [ ] Faucet payment appears as **pending** on Home within ~30 s, then confirms
- [ ] After the address is used, Receive rotates to a fresh address automatically
- [ ] "New address" button rotates ahead; warning appears near the gap limit

## Send
- [ ] Paste a mainnet bc1q address while on testnet → "wrong network" error
- [ ] Paste a `bitcoin:` URI with amount → recipient + amount pre-filled
- [ ] Send with each preset (Fast / Normal / Slow) — fee sat/vB matches the preset
- [ ] MAX sends the full balance minus fee, with no change output (check tx detail)
- [ ] Send to your own second wallet → shows as "Moved within wallet"? (No — separate
      wallets show Sent/Received; self-transfer within one wallet shows Moved)
- [ ] Sent tx appears as pending immediately after broadcast, links to /tx/…

## RBF bump
- [ ] Send with a 1 sat/vB custom fee (will get stuck)
- [ ] History shows "Bump fee" on the pending tx → bump to fast rate → replacement
      broadcasts; original disappears; recipient amount unchanged

## CPFP speed-up
- [ ] Receive a low-fee payment (send at 1 sat/vB from a second wallet, or hope
      for a slow faucet payout) → History shows "Speed up" on the pending
      incoming tx (and no "Bump fee")
- [ ] Preview shows current → package rate and the boost cost → broadcast; both
      txs confirm together; boost lands on your own change address
- [ ] After the parent confirms, the "Speed up" button disappears

## Lock & session
- [ ] Reload the page → lock screen appears (hot wallet)
- [ ] Wrong password rejected; correct password unlocks
- [ ] Auto-lock fires after the configured idle time
- [ ] Switch active wallet to watch-only → viewable WITHOUT unlocking
- [ ] "Forgot password" wipe (type WIPE) removes the hot wallet; watch-only survives;
      restore from seed works afterwards

## Watch-only
- [ ] Import a mainnet zpub → auto-switches to mainnet, scan finds balance + history
- [ ] Send is disabled for watch-only wallets
- [ ] Wrong-network notice appears when viewing a mainnet watch wallet on testnet

## Explorer & data
- [ ] Tx detail: status/confirmations, fee, fee rate, inputs/outputs, "yours" badges
- [ ] Address detail loads for any pasted address on the current network
- [ ] "View on mempool.space" links open the right network
- [ ] Fiat values shown on mainnet; hidden in practice mode

## PWA (after M6)
- [ ] Install prompt / installable (Lighthouse PWA pass)
- [ ] Offline: last-known balance + history render with an offline banner; send disabled
