import { describe, expect, it } from 'vitest';
import { convertVersion, parseWatchOnlyInput } from './slip132';
import { accountFromExtendedKey, accountXpub, deriveAccount, deriveAddress } from './derivation';
import { mnemonicToSeed } from './mnemonic';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const BIP84_ZPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const BIP84_ADDR_0_0 = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

describe('parseWatchOnlyInput', () => {
  it('normalizes a zpub to xpub with a p2wpkh hint', () => {
    const parsed = parseWatchOnlyInput(BIP84_ZPUB);
    expect(parsed.key.startsWith('xpub')).toBe(true);
    expect(parsed.network).toBe('mainnet');
    expect(parsed.scriptHint).toBe('p2wpkh');

    const watch = accountFromExtendedKey(parsed.key, parsed.network);
    expect(deriveAddress(watch, 'p2wpkh', 'mainnet', 0, 0).address).toBe(BIP84_ADDR_0_0);
  });

  it('passes a plain xpub through unchanged', () => {
    const xpub = convertVersion(BIP84_ZPUB, 'xpub');
    const parsed = parseWatchOnlyInput(xpub);
    expect(parsed.key).toBe(xpub);
    expect(parsed.network).toBe('mainnet');
    expect(parsed.scriptHint).toBeNull();
  });

  it('detects testnet keys (tpub/vpub)', () => {
    const seed = mnemonicToSeed(MNEMONIC);
    const tpub = accountXpub(deriveAccount(seed, 'p2wpkh', 'testnet4'));
    expect(parseWatchOnlyInput(tpub).network).toBe('testnet4');

    const vpub = convertVersion(tpub, 'vpub');
    const parsed = parseWatchOnlyInput(vpub);
    expect(parsed.network).toBe('testnet4');
    expect(parsed.scriptHint).toBe('p2wpkh');
    expect(parsed.key).toBe(tpub);
  });

  it('accepts wpkh() descriptors with origin info and checksum', () => {
    const xpub = convertVersion(BIP84_ZPUB, 'xpub');
    for (const input of [
      `wpkh(${xpub})`,
      `wpkh([73c5da0a/84h/0h/0h]${xpub}/0/*)`,
      `wpkh([73c5da0a/84h/0h/0h]${xpub}/0/*)#abcd0123`,
    ]) {
      const parsed = parseWatchOnlyInput(input);
      expect(parsed.key).toBe(xpub);
      expect(parsed.scriptHint).toBe('p2wpkh');
    }
  });

  it('rejects private keys with a warning about sharing', () => {
    expect(() =>
      parseWatchOnlyInput(
        'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
      ),
    ).toThrow(/PRIVATE/);
  });

  it('rejects nested-segwit and garbage input', () => {
    expect(() => parseWatchOnlyInput('ypub6QqdH2c5z79680000000000000000000')).toThrow(/Nested SegWit/);
    expect(() => parseWatchOnlyInput('hello')).toThrow(/recognized/);
    expect(() => parseWatchOnlyInput(`xpub${'1'.repeat(40)}`)).toThrow();
  });
});

describe('convertVersion', () => {
  it('roundtrips zpub -> xpub -> zpub', () => {
    const xpub = convertVersion(BIP84_ZPUB, 'xpub');
    expect(convertVersion(xpub, 'zpub')).toBe(BIP84_ZPUB);
  });
});
