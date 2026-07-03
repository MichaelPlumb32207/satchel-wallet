import type { HDKey } from '@scure/bip32';
import { accountFromExtendedKey } from '@/lib/bitcoin/derivation';
import { getAccount } from '@/lib/vault/keyring';
import type { NetworkId } from '@/lib/networks';
import type { WalletMeta } from '@/stores/wallets';

/**
 * Resolve the account-level HD node for any wallet on a network:
 * hot wallets come from the (unlocked) keyring, watch-only wallets from
 * their stored public key. Returns null when unavailable (locked keyring,
 * or a watch-only wallet viewed on the wrong network).
 */
export function resolveAccount(wallet: WalletMeta, networkId: NetworkId): HDKey | null {
  if (wallet.type === 'watch') {
    if (!wallet.watchKey || wallet.watchNetwork !== networkId) return null;
    try {
      return accountFromExtendedKey(wallet.watchKey, networkId);
    } catch {
      return null;
    }
  }
  try {
    return getAccount(wallet.id, wallet.scriptType, networkId);
  } catch {
    return null; // locked
  }
}
