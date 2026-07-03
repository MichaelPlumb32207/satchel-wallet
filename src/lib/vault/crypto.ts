import { scryptAsync } from '@noble/hashes/scrypt.js';
import { base64 } from '@scure/base';

/**
 * Vault format: everything secret in Satchel lives in ONE blob encrypted
 * with the user's app password.
 *
 *   password --scrypt(N,r,p,salt)--> 32-byte key --AES-256-GCM(nonce)--> ciphertext
 *
 * - scrypt (memory-hard) over PBKDF2: GPU/ASIC cracking rigs hate the 64 MiB
 *   memory requirement; native WebCrypto PBKDF2 isn't worth the weaker profile.
 * - AES-GCM is authenticated: a wrong password or tampered blob fails cleanly
 *   at decrypt, it can never return garbage plaintext.
 * - The KDF params are stored alongside so they can be raised in a future
 *   version without breaking existing vaults.
 */

export interface VaultWalletSecret {
  id: string;
  mnemonic: string;
  /** BIP39 passphrase ("25th word"). Not recoverable from the mnemonic — must be stored. */
  passphrase?: string;
}

export interface VaultPayload {
  wallets: VaultWalletSecret[];
}

export interface KdfParams {
  N: number;
  r: number;
  p: number;
}

/** ~64 MiB, ~0.5–1 s on a modern phone. */
export const DEFAULT_KDF: KdfParams = { N: 2 ** 16, r: 8, p: 1 };

export interface EncryptedVault {
  version: 1;
  kdf: KdfParams & { name: 'scrypt'; salt: string };
  cipher: { name: 'AES-256-GCM'; nonce: string };
  ciphertext: string;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password (or the vault data is corrupted)');
    this.name = 'WrongPasswordError';
  }
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<CryptoKey> {
  const keyBytes = await scryptAsync(password.normalize('NFKD'), salt, {
    ...params,
    dkLen: 32,
  });
  return crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptVault(
  payload: VaultPayload,
  password: string,
  kdf: KdfParams = DEFAULT_KDF,
): Promise<EncryptedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, kdf);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    key,
    plaintext as BufferSource,
  );
  return {
    version: 1,
    kdf: { name: 'scrypt', ...kdf, salt: base64.encode(salt) },
    cipher: { name: 'AES-256-GCM', nonce: base64.encode(nonce) },
    ciphertext: base64.encode(new Uint8Array(ciphertext)),
  };
}

export async function decryptVault(
  vault: EncryptedVault,
  password: string,
): Promise<VaultPayload> {
  if (vault.version !== 1) {
    throw new Error(`Unsupported vault version ${vault.version} — update Satchel`);
  }
  const salt = base64.decode(vault.kdf.salt);
  const nonce = base64.decode(vault.cipher.nonce);
  const key = await deriveKey(password, salt, vault.kdf);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource },
      key,
      base64.decode(vault.ciphertext) as BufferSource,
    );
  } catch {
    throw new WrongPasswordError();
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as VaultPayload;
}
