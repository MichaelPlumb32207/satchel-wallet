import { describe, expect, it } from 'vitest';
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { buildAndSignTx, RBF_SEQUENCE, type PlannedInput } from './psbt';
import { checkAddress } from './addresses';
import { deriveAccount, deriveAddress, derivePrivateKey } from './derivation';
import { mnemonicToSeed } from './mnemonic';
import { estimateVsize } from './fees';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const account = deriveAccount(mnemonicToSeed(MNEMONIC), 'p2wpkh', 'mainnet');

function plannedInput(chain: 0 | 1, index: number, value: bigint): PlannedInput {
  const derived = deriveAddress(account, 'p2wpkh', 'mainnet', chain, index);
  return {
    txid: 'ab'.repeat(32),
    vout: 0,
    value,
    scriptType: 'p2wpkh',
    chain,
    index,
    publicKey: derived.publicKey,
  };
}

const RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const CHANGE = deriveAddress(account, 'p2wpkh', 'mainnet', 1, 0).address;

describe('buildAndSignTx', () => {
  it('produces a fully signed, RBF-signaling, decodable transaction', () => {
    const inputs = [plannedInput(0, 0, 100_000n)];
    const outputs = [
      { address: RECIPIENT, amount: 60_000n },
      { address: CHANGE, amount: 39_859n },
    ];
    const signed = buildAndSignTx(inputs, outputs, 'mainnet', (chain, index) =>
      derivePrivateKey(account, chain, index),
    );

    expect(signed.fee).toBe(141n);
    expect(signed.txid).toMatch(/^[0-9a-f]{64}$/);

    // Decode the raw tx and verify structure end-to-end.
    const decoded = btc.Transaction.fromRaw(hex.decode(signed.hex));
    expect(decoded.inputsLength).toBe(1);
    expect(decoded.outputsLength).toBe(2);
    expect(decoded.getInput(0).sequence).toBe(RBF_SEQUENCE);
    expect(decoded.getOutput(0)!.amount).toBe(60_000n);
    const expected = checkAddress(RECIPIENT, 'mainnet');
    if (!expected.ok) throw new Error('test recipient invalid');
    expect(hex.encode(decoded.getOutput(0)!.script!)).toBe(hex.encode(expected.script));
  });

  it('real vsize stays at or below the estimate used for fees', () => {
    const inputs = [plannedInput(0, 0, 80_000n), plannedInput(1, 3, 40_000n)];
    const outputs = [
      { address: RECIPIENT, amount: 100_000n },
      { address: CHANGE, amount: 19_641n },
    ];
    const signed = buildAndSignTx(inputs, outputs, 'mainnet', (chain, index) =>
      derivePrivateKey(account, chain, index),
    );
    const estimated = estimateVsize(['p2wpkh', 'p2wpkh'], ['p2wpkh', 'p2wpkh']);
    // Estimate assumes worst-case 72-byte signatures; real ones are 71-72.
    expect(signed.vsize).toBeLessThanOrEqual(estimated);
    expect(signed.vsize).toBeGreaterThanOrEqual(estimated - 2);
  });

  it('signs multiple inputs from both chains', () => {
    const inputs = [plannedInput(0, 1, 50_000n), plannedInput(1, 0, 50_000n)];
    const signed = buildAndSignTx(
      inputs,
      [{ address: RECIPIENT, amount: 99_800n }],
      'mainnet',
      (chain, index) => derivePrivateKey(account, chain, index),
    );
    const decoded = btc.Transaction.fromRaw(hex.decode(signed.hex));
    expect(decoded.isFinal).toBe(true);
  });

  it('rejects empty plans', () => {
    expect(() => buildAndSignTx([], [{ address: RECIPIENT, amount: 1_000n }], 'mainnet', () => {
      throw new Error('unreachable');
    })).toThrow(/inputs/);
  });
});
