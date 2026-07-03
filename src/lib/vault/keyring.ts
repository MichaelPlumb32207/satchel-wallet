import type { HDKey } from '@scure/bip32';
import { deriveAccount, derivePrivateKey } from '@/lib/bitcoin/derivation';
import { mnemonicToSeed } from '@/lib/bitcoin/mnemonic';
import type { Chain, ScriptType } from '@/lib/bitcoin/types';
import type { NetworkId } from '@/lib/networks';
import { useSessionStore } from '@/stores/session';
import {
  decryptVault,
  encryptVault,
  type VaultPayload,
  type VaultWalletSecret,
} from './crypto';
import { deleteVault, loadVault, requestPersistence, saveVault } from './storage';

/**
 * The keyring is the ONLY holder of decrypted key material, in this module
 * closure — never in React state, stores, or props.
 *
 * On unlock we derive account-level nodes (m/84'/x'/0') for each hot wallet
 * on both networks, then immediately drop the seed. Account nodes are enough
 * to derive addresses and sign; a leak of one exposes one account, not the
 * mnemonic or the BIP39 passphrase.
 *
 * Honest caveat: JavaScript cannot guarantee zeroization (GC copies, JIT).
 * wipePrivateData() + dereferencing is best-effort hardening — the real
 * security boundaries are the scrypt KDF and the auto-lock.
 */

// v1 derives p2wpkh only; add 'p2tr' here when taproot receive ships.
const SCRIPT_TYPES: ScriptType[] = ['p2wpkh'];
const NETWORK_IDS: NetworkId[] = ['mainnet', 'testnet4'];

type AccountKey = `${string}:${ScriptType}:${NetworkId}`;

let accounts: Map<AccountKey, HDKey> | null = null;

function accountKey(walletId: string, scriptType: ScriptType, networkId: NetworkId): AccountKey {
  return `${walletId}:${scriptType}:${networkId}`;
}

function deriveAllAccounts(payload: VaultPayload): Map<AccountKey, HDKey> {
  const map = new Map<AccountKey, HDKey>();
  for (const wallet of payload.wallets) {
    const seed = mnemonicToSeed(wallet.mnemonic, wallet.passphrase ?? '');
    for (const scriptType of SCRIPT_TYPES) {
      for (const networkId of NETWORK_IDS) {
        map.set(
          accountKey(wallet.id, scriptType, networkId),
          deriveAccount(seed, scriptType, networkId),
        );
      }
    }
    seed.fill(0);
  }
  return map;
}

function setUnlocked(map: Map<AccountKey, HDKey>): void {
  accounts = map;
  useSessionStore.getState()._setStatus('unlocked');
}

export function isUnlocked(): boolean {
  return accounts !== null;
}

/** Wipe all in-memory key material and flip the session to locked. */
export function lock(): void {
  if (accounts) {
    for (const node of accounts.values()) node.wipePrivateData();
    accounts.clear();
    accounts = null;
  }
  useSessionStore.getState()._setStatus('locked');
}

/** Create a brand-new vault with its first hot wallet, and unlock it. */
export async function createVault(password: string, first: VaultWalletSecret): Promise<void> {
  if (await loadVault()) {
    throw new Error('A vault already exists — unlock it or wipe it first');
  }
  const payload: VaultPayload = { wallets: [first] };
  await saveVault(await encryptVault(payload, password));
  void requestPersistence();
  setUnlocked(deriveAllAccounts(payload));
}

/** Decrypt the vault and hold account keys in memory. Throws WrongPasswordError. */
export async function unlock(password: string): Promise<void> {
  const vault = await loadVault();
  if (!vault) throw new Error('No vault exists yet');
  const payload = await decryptVault(vault, password);
  setUnlocked(deriveAllAccounts(payload));
}

/**
 * Account node for address derivation. Watch-only wallets are NOT here —
 * they derive from their stored xpub without the keyring.
 */
export function getAccount(
  walletId: string,
  scriptType: ScriptType,
  networkId: NetworkId,
): HDKey {
  if (!accounts) throw new Error('Wallet is locked');
  const node = accounts.get(accountKey(walletId, scriptType, networkId));
  if (!node) throw new Error(`No key material for wallet ${walletId}`);
  return node;
}

/**
 * Sign-scoped private key access. Callers (the send flow) must use the key
 * within the signing call and drop it — never store or export it.
 */
export function getSigningKey(
  walletId: string,
  scriptType: ScriptType,
  networkId: NetworkId,
  chain: Chain,
  index: number,
): Uint8Array {
  return derivePrivateKey(getAccount(walletId, scriptType, networkId), chain, index);
}

/**
 * Re-decrypt the vault to reveal a mnemonic for backup. Always requires the
 * password again (even while unlocked) and retains nothing extra in memory.
 */
export async function revealSecret(
  password: string,
  walletId: string,
): Promise<VaultWalletSecret> {
  const vault = await loadVault();
  if (!vault) throw new Error('No vault exists yet');
  const payload = await decryptVault(vault, password);
  const secret = payload.wallets.find((w) => w.id === walletId);
  if (!secret) throw new Error('Wallet not found in vault');
  return secret;
}

/** Add another hot wallet. Requires the password (verifies + re-encrypts). */
export async function addWallet(password: string, secret: VaultWalletSecret): Promise<void> {
  const vault = await loadVault();
  if (!vault) throw new Error('No vault exists yet');
  const payload = await decryptVault(vault, password);
  if (payload.wallets.some((w) => w.id === secret.id)) {
    throw new Error('Wallet id already in vault');
  }
  payload.wallets.push(secret);
  await saveVault(await encryptVault(payload, password));
  setUnlocked(deriveAllAccounts(payload));
}

/** Remove a hot wallet's secrets (e.g. user deletes a wallet). */
export async function removeWallet(password: string, walletId: string): Promise<void> {
  const vault = await loadVault();
  if (!vault) throw new Error('No vault exists yet');
  const payload = await decryptVault(vault, password);
  payload.wallets = payload.wallets.filter((w) => w.id !== walletId);
  await saveVault(await encryptVault(payload, password));
  setUnlocked(deriveAllAccounts(payload));
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const vault = await loadVault();
  if (!vault) throw new Error('No vault exists yet');
  const payload = await decryptVault(vault, oldPassword);
  await saveVault(await encryptVault(payload, newPassword));
}

/**
 * Forgot-password escape hatch: destroy the vault entirely. Funds are only
 * recoverable from the seed phrase after this. Callers gate this behind a
 * typed confirmation.
 */
export async function wipeVault(): Promise<void> {
  await deleteVault();
  lock();
}
