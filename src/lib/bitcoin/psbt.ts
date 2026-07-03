import * as btc from '@scure/btc-signer';
import { scriptForPubkey } from './derivation';
import type { Chain, ScriptType } from './types';
import { getNetwork, type NetworkId } from '@/lib/networks';

/** BIP125: any sequence below 0xfffffffe signals replaceability. */
export const RBF_SEQUENCE = 0xfffffffd;

export interface PlannedInput {
  txid: string;
  vout: number;
  value: bigint;
  scriptType: ScriptType;
  /** Derivation coordinates within the account — the keyring signs by these. */
  chain: Chain;
  index: number;
  /** Compressed pubkey for the input's script (from the account node). */
  publicKey: Uint8Array;
}

export interface PlannedOutput {
  address: string;
  amount: bigint;
}

export interface SignedTx {
  hex: string;
  txid: string;
  vsize: number;
  fee: bigint;
}

/**
 * Build, sign, and finalize a transaction. All inputs are our own segwit
 * outputs (witnessUtxo only — no legacy prevtx fetching). RBF is always on.
 *
 * `getKey` hands back the private key for one derivation slot; it comes from
 * the keyring and the bytes must not outlive this call.
 */
export function buildAndSignTx(
  inputs: PlannedInput[],
  outputs: PlannedOutput[],
  networkId: NetworkId,
  getKey: (chain: Chain, index: number) => Uint8Array,
): SignedTx {
  if (inputs.length === 0) throw new Error('No inputs to spend');
  if (outputs.length === 0) throw new Error('No outputs to create');
  const net = getNetwork(networkId).btc;

  const tx = new btc.Transaction();
  for (const input of inputs) {
    tx.addInput({
      txid: input.txid,
      index: input.vout,
      sequence: RBF_SEQUENCE,
      witnessUtxo: {
        script: scriptForPubkey(input.publicKey, input.scriptType, networkId),
        amount: input.value,
      },
      ...(input.scriptType === 'p2tr' ? { tapInternalKey: input.publicKey.slice(1, 33) } : {}),
    });
  }
  for (const output of outputs) {
    tx.addOutputAddress(output.address, output.amount, net);
  }

  inputs.forEach((input, i) => {
    const key = getKey(input.chain, input.index);
    try {
      tx.signIdx(key, i);
    } finally {
      key.fill(0);
    }
  });

  tx.finalize();

  const totalIn = inputs.reduce((sum, i) => sum + i.value, 0n);
  const totalOut = outputs.reduce((sum, o) => sum + o.amount, 0n);
  return {
    hex: tx.hex,
    txid: tx.id,
    vsize: tx.vsize,
    fee: totalIn - totalOut,
  };
}
