import { describe, expect, it } from 'vitest';
import {
  accountFromExtendedKey,
  accountPath,
  accountXpub,
  deriveAccount,
  deriveAddress,
  deriveAddressRange,
  derivePrivateKey,
} from './derivation';
import { mnemonicToSeed } from './mnemonic';
import { convertVersion } from './slip132';

// The BIP84 / BIP86 reference mnemonic.
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const seed = mnemonicToSeed(MNEMONIC);

// Published BIP84 test vectors
const BIP84_ZPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const BIP84_ADDR_0_0 = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const BIP84_ADDR_0_1 = 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g';
const BIP84_CHANGE_1_0 = 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el';

// Published BIP86 test vectors
const BIP86_ADDR_0_0 = 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr';
const BIP86_ADDR_0_1 = 'bc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0was9fqzwh';
const BIP86_CHANGE_1_0 = 'bc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqwruhk7';

describe('BIP84 derivation (mainnet)', () => {
  const account = deriveAccount(seed, 'p2wpkh', 'mainnet');

  it('derives the account path m/84h/0h/0h', () => {
    expect(accountPath('p2wpkh', 'mainnet')).toBe("m/84'/0'/0'");
  });

  it('matches the published account zpub', () => {
    expect(accountXpub(account)).toBe(convertVersion(BIP84_ZPUB, 'xpub'));
  });

  it('derives the published receive addresses', () => {
    expect(deriveAddress(account, 'p2wpkh', 'mainnet', 0, 0).address).toBe(BIP84_ADDR_0_0);
    expect(deriveAddress(account, 'p2wpkh', 'mainnet', 0, 1).address).toBe(BIP84_ADDR_0_1);
  });

  it('derives the published change address on the internal chain', () => {
    expect(deriveAddress(account, 'p2wpkh', 'mainnet', 1, 0).address).toBe(BIP84_CHANGE_1_0);
  });

  it('range derivation matches individual derivation', () => {
    const range = deriveAddressRange(account, 'p2wpkh', 'mainnet', 0, 0, 2);
    expect(range.map((a) => a.address)).toEqual([BIP84_ADDR_0_0, BIP84_ADDR_0_1]);
    expect(range[1].path).toBe("m/84'/0'/0'/0/1");
  });
});

describe('BIP86 taproot derivation (mainnet)', () => {
  const account = deriveAccount(seed, 'p2tr', 'mainnet');

  it('derives the published taproot addresses', () => {
    expect(deriveAddress(account, 'p2tr', 'mainnet', 0, 0).address).toBe(BIP86_ADDR_0_0);
    expect(deriveAddress(account, 'p2tr', 'mainnet', 0, 1).address).toBe(BIP86_ADDR_0_1);
    expect(deriveAddress(account, 'p2tr', 'mainnet', 1, 0).address).toBe(BIP86_CHANGE_1_0);
  });
});

describe('testnet4 derivation', () => {
  const account = deriveAccount(seed, 'p2wpkh', 'testnet4');

  it("uses coin type 1' and tpub serialization", () => {
    expect(accountPath('p2wpkh', 'testnet4')).toBe("m/84'/1'/0'");
    expect(accountXpub(account).startsWith('tpub')).toBe(true);
  });

  it('derives tb1 addresses', () => {
    const addr = deriveAddress(account, 'p2wpkh', 'testnet4', 0, 0).address;
    expect(addr.startsWith('tb1q')).toBe(true);
  });
});

describe('watch-only (xpub) derivation', () => {
  it('derives the same addresses as the private account node', () => {
    const account = deriveAccount(seed, 'p2wpkh', 'mainnet');
    const watch = accountFromExtendedKey(accountXpub(account), 'mainnet');
    expect(deriveAddress(watch, 'p2wpkh', 'mainnet', 0, 0).address).toBe(BIP84_ADDR_0_0);
    expect(deriveAddress(watch, 'p2wpkh', 'mainnet', 1, 0).address).toBe(BIP84_CHANGE_1_0);
  });

  it('refuses to produce private keys', () => {
    const account = deriveAccount(seed, 'p2wpkh', 'mainnet');
    const watch = accountFromExtendedKey(accountXpub(account), 'mainnet');
    expect(() => derivePrivateKey(watch, 0, 0)).toThrow(/watch-only/);
  });
});

describe('signing keys', () => {
  it('derives a private key that matches the address pubkey', () => {
    const account = deriveAccount(seed, 'p2wpkh', 'mainnet');
    const key = derivePrivateKey(account, 0, 0);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });
});
