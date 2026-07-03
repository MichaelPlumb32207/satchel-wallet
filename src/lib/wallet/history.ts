import type { Tx } from '@/lib/api/types';

/** A transaction interpreted from this wallet's point of view. */
export interface WalletTx {
  txid: string;
  direction: 'in' | 'out' | 'self';
  /** Net effect on the wallet in sats: positive incoming, negative outgoing (includes fee). */
  netSats: bigint;
  /** Miner fee — only meaningful when we funded the tx (out/self). */
  fee: bigint | null;
  confirmed: boolean;
  blockTime: number | null;
  blockHeight: number | null;
  /** Display hint: who we paid / who paid us (first non-wallet address). */
  counterparty: string | null;
  /** Unconfirmed + signaling BIP125 -> the fee can be bumped. */
  bumpable: boolean;
}

/**
 * Classify raw mempool.space txs relative to our address set. Pure function —
 * the data hooks feed it merged chain+mempool pages.
 */
export function classifyTxs(txs: Tx[], ours: Set<string>): WalletTx[] {
  const seen = new Set<string>();
  const out: WalletTx[] = [];

  for (const tx of txs) {
    if (seen.has(tx.txid)) continue;
    seen.add(tx.txid);

    let inFromUs = 0n;
    let outToUs = 0n;
    let weSpendInputs = false;
    let rbfSignaling = false;
    let counterpartyIn: string | null = null;
    let counterpartyOut: string | null = null;
    let allOutputsOurs = true;

    for (const vin of tx.vin) {
      if (vin.sequence < 0xfffffffe) rbfSignaling = true;
      const addr = vin.prevout?.scriptpubkey_address;
      if (addr && ours.has(addr)) {
        weSpendInputs = true;
        inFromUs += BigInt(vin.prevout!.value);
      } else if (addr && !counterpartyIn) {
        counterpartyIn = addr;
      }
    }

    for (const vout of tx.vout) {
      const addr = vout.scriptpubkey_address;
      if (addr && ours.has(addr)) {
        outToUs += BigInt(vout.value);
      } else {
        allOutputsOurs = false;
        if (addr && !counterpartyOut) counterpartyOut = addr;
      }
    }

    const net = outToUs - inFromUs;
    const direction: WalletTx['direction'] = !weSpendInputs
      ? 'in'
      : allOutputsOurs
        ? 'self'
        : 'out';

    out.push({
      txid: tx.txid,
      direction,
      netSats: net,
      fee: weSpendInputs ? BigInt(tx.fee) : null,
      confirmed: tx.status.confirmed,
      blockTime: tx.status.block_time ?? null,
      blockHeight: tx.status.block_height ?? null,
      counterparty: direction === 'in' ? counterpartyIn : counterpartyOut,
      bumpable: weSpendInputs && !tx.status.confirmed && rbfSignaling,
    });
  }

  return out.sort((a, b) => {
    if (a.confirmed !== b.confirmed) return a.confirmed ? 1 : -1;
    return (b.blockTime ?? Infinity) - (a.blockTime ?? Infinity);
  });
}
