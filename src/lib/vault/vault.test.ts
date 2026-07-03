import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  decryptVault,
  encryptVault,
  WrongPasswordError,
  type KdfParams,
  type VaultPayload,
} from './crypto';
import {
  createVault,
  getAccount,
  getSigningKey,
  isUnlocked,
  lock,
  revealSecret,
  addWallet,
  changePassword,
  unlock,
  wipeVault,
} from './keyring';
import { deleteVault, loadVault, vaultExists } from './storage';
import { deriveAccount, deriveAddress } from '@/lib/bitcoin/derivation';
import { mnemonicToSeed } from '@/lib/bitcoin/mnemonic';
import { useSessionStore } from '@/stores/session';

// Weak-but-fast KDF for tests; production uses DEFAULT_KDF (N=2^16).
const TEST_KDF: KdfParams = { N: 2 ** 12, r: 8, p: 1 };

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const BIP84_ADDR_0_0 = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

const payload: VaultPayload = {
  wallets: [{ id: 'w1', mnemonic: MNEMONIC }],
};

describe('vault crypto', () => {
  it('roundtrips encrypt -> decrypt', async () => {
    const vault = await encryptVault(payload, 'hunter2', TEST_KDF);
    expect(vault.version).toBe(1);
    expect(vault.kdf.name).toBe('scrypt');
    await expect(decryptVault(vault, 'hunter2')).resolves.toEqual(payload);
  });

  it('rejects a wrong password with a typed error', async () => {
    const vault = await encryptVault(payload, 'hunter2', TEST_KDF);
    await expect(decryptVault(vault, 'wrong')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('rejects tampered ciphertext (GCM authentication)', async () => {
    const vault = await encryptVault(payload, 'hunter2', TEST_KDF);
    const bytes = Buffer.from(vault.ciphertext, 'base64');
    bytes[0] ^= 0xff;
    const tampered = { ...vault, ciphertext: bytes.toString('base64') };
    await expect(decryptVault(tampered, 'hunter2')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('refuses unknown vault versions', async () => {
    const vault = await encryptVault(payload, 'hunter2', TEST_KDF);
    const future = { ...vault, version: 99 as unknown as 1 };
    await expect(decryptVault(future, 'hunter2')).rejects.toThrow(/version/);
  });

  it('produces a fresh salt and nonce on every encryption', async () => {
    const a = await encryptVault(payload, 'hunter2', TEST_KDF);
    const b = await encryptVault(payload, 'hunter2', TEST_KDF);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.nonce).not.toBe(b.cipher.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});

describe('keyring lifecycle', () => {
  beforeEach(async () => {
    lock();
    await deleteVault();
  });

  it('createVault unlocks and derives the right account keys', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    expect(isUnlocked()).toBe(true);
    expect(useSessionStore.getState().status).toBe('unlocked');
    expect(await vaultExists()).toBe(true);

    const account = getAccount('w1', 'p2wpkh', 'mainnet');
    expect(deriveAddress(account, 'p2wpkh', 'mainnet', 0, 0).address).toBe(BIP84_ADDR_0_0);
  });

  it('lock() wipes keys and getAccount throws', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    lock();
    expect(isUnlocked()).toBe(false);
    expect(useSessionStore.getState().status).toBe('locked');
    expect(() => getAccount('w1', 'p2wpkh', 'mainnet')).toThrow(/locked/);
  });

  it('unlock() restores signing after a lock', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    lock();
    await expect(unlock('nope')).rejects.toBeInstanceOf(WrongPasswordError);
    expect(isUnlocked()).toBe(false);

    await unlock('pw');
    expect(isUnlocked()).toBe(true);
    const key = getSigningKey('w1', 'p2wpkh', 'mainnet', 0, 0);
    expect(key.length).toBe(32);
  });

  it('supports testnet accounts from the same wallet', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    const account = getAccount('w1', 'p2wpkh', 'testnet4');
    expect(deriveAddress(account, 'p2wpkh', 'testnet4', 0, 0).address.startsWith('tb1q')).toBe(
      true,
    );
  });

  it('honors the BIP39 passphrase (different addresses)', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC, passphrase: 'extra' });
    const account = getAccount('w1', 'p2wpkh', 'mainnet');
    const derived = deriveAddress(account, 'p2wpkh', 'mainnet', 0, 0).address;
    expect(derived).not.toBe(BIP84_ADDR_0_0);

    const expected = deriveAddress(
      deriveAccount(mnemonicToSeed(MNEMONIC, 'extra'), 'p2wpkh', 'mainnet'),
      'p2wpkh',
      'mainnet',
      0,
      0,
    ).address;
    expect(derived).toBe(expected);
  });

  it('revealSecret requires the password and returns the mnemonic', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    await expect(revealSecret('wrong', 'w1')).rejects.toBeInstanceOf(WrongPasswordError);
    await expect(revealSecret('pw', 'w1')).resolves.toEqual({ id: 'w1', mnemonic: MNEMONIC });
  });

  it('addWallet stores a second wallet under the same password', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    const second = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    await addWallet('pw', { id: 'w2', mnemonic: second });
    expect(() => getAccount('w2', 'p2wpkh', 'mainnet')).not.toThrow();
    expect(() => getAccount('w1', 'p2wpkh', 'mainnet')).not.toThrow();
  });

  it('changePassword re-encrypts the vault', async () => {
    await createVault('old', { id: 'w1', mnemonic: MNEMONIC });
    await changePassword('old', 'new');
    lock();
    await expect(unlock('old')).rejects.toBeInstanceOf(WrongPasswordError);
    await unlock('new');
    expect(isUnlocked()).toBe(true);
  });

  it('wipeVault deletes everything and locks', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    await wipeVault();
    expect(isUnlocked()).toBe(false);
    expect(await loadVault()).toBeNull();
    await expect(unlock('pw')).rejects.toThrow(/No vault/);
  });

  it('refuses to create a second vault over an existing one', async () => {
    await createVault('pw', { id: 'w1', mnemonic: MNEMONIC });
    await expect(createVault('pw2', { id: 'w2', mnemonic: MNEMONIC })).rejects.toThrow(
      /already exists/,
    );
  });
});
