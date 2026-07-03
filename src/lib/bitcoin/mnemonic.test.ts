import { describe, expect, it } from 'vitest';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  createMnemonic,
  isBip39Word,
  isValidMnemonic,
  mnemonicToSeed,
  normalizeMnemonic,
  suggestWords,
} from './mnemonic';

// BIP39 test vector #1 (Trezor reference vectors, passphrase "TREZOR")
const VECTOR_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VECTOR_SEED =
  'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04';

describe('mnemonicToSeed', () => {
  it('matches BIP39 test vector #1', () => {
    expect(bytesToHex(mnemonicToSeed(VECTOR_MNEMONIC, 'TREZOR'))).toBe(VECTOR_SEED);
  });

  it('passphrase changes the seed', () => {
    const withPass = mnemonicToSeed(VECTOR_MNEMONIC, 'hunter2');
    const without = mnemonicToSeed(VECTOR_MNEMONIC);
    expect(bytesToHex(withPass)).not.toBe(bytesToHex(without));
  });
});

describe('isValidMnemonic', () => {
  it('accepts the vector mnemonic in any formatting', () => {
    expect(isValidMnemonic(VECTOR_MNEMONIC)).toBe(true);
    expect(isValidMnemonic(`  ${VECTOR_MNEMONIC.toUpperCase()}  `)).toBe(true);
    expect(isValidMnemonic(VECTOR_MNEMONIC.split(' ').join('\n  '))).toBe(true);
  });

  it('rejects bad checksums and non-words', () => {
    // 12x "abandon" has an invalid checksum
    expect(isValidMnemonic(Array(12).fill('abandon').join(' '))).toBe(false);
    expect(isValidMnemonic(VECTOR_MNEMONIC.replace('about', 'zebra'))).toBe(false);
    expect(isValidMnemonic('not a mnemonic at all')).toBe(false);
    expect(isValidMnemonic('')).toBe(false);
  });
});

describe('createMnemonic', () => {
  it('generates valid 12- and 24-word phrases', () => {
    const twelve = createMnemonic(12);
    const twentyFour = createMnemonic(24);
    expect(twelve.split(' ')).toHaveLength(12);
    expect(twentyFour.split(' ')).toHaveLength(24);
    expect(isValidMnemonic(twelve)).toBe(true);
    expect(isValidMnemonic(twentyFour)).toBe(true);
    expect(createMnemonic(12)).not.toBe(twelve); // CSPRNG, not deterministic
  });
});

describe('normalizeMnemonic', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeMnemonic('  Abandon\tABOUT \n')).toBe('abandon about');
  });
});

describe('word helpers', () => {
  it('recognizes BIP39 words', () => {
    expect(isBip39Word('abandon')).toBe(true);
    expect(isBip39Word('Zoo')).toBe(true);
    expect(isBip39Word('zebro')).toBe(false);
  });

  it('suggests completions', () => {
    expect(suggestWords('aban')).toEqual(['abandon']);
    expect(suggestWords('zo')).toEqual(['zone', 'zoo']);
    expect(suggestWords('')).toEqual([]);
    expect(suggestWords('xyz')).toEqual([]);
  });
});
