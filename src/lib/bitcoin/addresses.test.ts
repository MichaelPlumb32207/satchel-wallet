import { describe, expect, it } from 'vitest';
import { checkAddress, outputTypeOf } from './addresses';

// Known-valid addresses of each type
const P2WPKH_MAIN = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'; // BIP173 example
const P2WPKH_TEST = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'; // BIP173 example
const P2TR_MAIN = 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr'; // BIP86 vector
const P2PKH_MAIN = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const P2SH_MAIN = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

describe('checkAddress', () => {
  it('accepts each standard mainnet type with correct classification', () => {
    expect(checkAddress(P2WPKH_MAIN, 'mainnet')).toMatchObject({ ok: true, type: 'p2wpkh' });
    expect(checkAddress(P2TR_MAIN, 'mainnet')).toMatchObject({ ok: true, type: 'p2tr' });
    expect(checkAddress(P2PKH_MAIN, 'mainnet')).toMatchObject({ ok: true, type: 'p2pkh' });
    expect(checkAddress(P2SH_MAIN, 'mainnet')).toMatchObject({ ok: true, type: 'p2sh' });
  });

  it('returns the scriptPubKey for valid addresses', () => {
    const check = checkAddress(P2WPKH_MAIN, 'mainnet');
    if (!check.ok) throw new Error('expected valid');
    // P2WPKH script: OP_0 PUSH20 <hash> = 22 bytes
    expect(check.script.length).toBe(22);
    expect(check.script[0]).toBe(0);
  });

  it('accepts uppercase bech32 (QR alphanumeric form)', () => {
    expect(checkAddress(P2WPKH_MAIN.toUpperCase(), 'mainnet')).toMatchObject({
      ok: true,
      type: 'p2wpkh',
    });
  });

  it('detects wrong-network addresses in both directions', () => {
    expect(checkAddress(P2WPKH_TEST, 'mainnet')).toEqual({
      ok: false,
      reason: 'wrong-network',
      detected: 'testnet4',
    });
    expect(checkAddress(P2WPKH_MAIN, 'testnet4')).toEqual({
      ok: false,
      reason: 'wrong-network',
      detected: 'mainnet',
    });
    expect(checkAddress(P2PKH_MAIN, 'testnet4')).toEqual({
      ok: false,
      reason: 'wrong-network',
      detected: 'mainnet',
    });
  });

  it('rejects corrupted and garbage input', () => {
    const corrupted = P2WPKH_MAIN.slice(0, -1) + '5'; // break the checksum
    expect(checkAddress(corrupted, 'mainnet')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkAddress('', 'mainnet')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkAddress('not-an-address', 'mainnet')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkAddress('bc1qqqqqqqq', 'mainnet')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('outputTypeOf', () => {
  it('returns the type for valid addresses and throws otherwise', () => {
    expect(outputTypeOf(P2TR_MAIN, 'mainnet')).toBe('p2tr');
    expect(() => outputTypeOf('garbage', 'mainnet')).toThrow(/Invalid address/);
  });
});
