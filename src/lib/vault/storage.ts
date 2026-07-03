import { del, get, set } from 'idb-keyval';
import type { EncryptedVault } from './crypto';

/**
 * The encrypted vault blob lives in IndexedDB: binary-friendly, async,
 * reachable from a service worker, and eligible for eviction protection
 * via navigator.storage.persist() — none of which localStorage offers.
 */
const VAULT_KEY = 'satchel.vault.v1';

export async function loadVault(): Promise<EncryptedVault | null> {
  return (await get<EncryptedVault>(VAULT_KEY)) ?? null;
}

export async function saveVault(vault: EncryptedVault): Promise<void> {
  await set(VAULT_KEY, vault);
}

export async function deleteVault(): Promise<void> {
  await del(VAULT_KEY);
}

export async function vaultExists(): Promise<boolean> {
  return (await loadVault()) !== null;
}

/**
 * Ask the browser not to evict our storage under pressure. Losing the vault
 * is recoverable (seed phrase) but scary — request protection once a wallet
 * exists. Returns whether persistence is granted; failures are non-fatal.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Not supported / denied — nothing to do.
  }
  return false;
}
