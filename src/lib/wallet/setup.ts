import { isValidMnemonic, normalizeMnemonic } from '@/lib/bitcoin/mnemonic';
import { parseWatchOnlyInput } from '@/lib/bitcoin/slip132';
import { addWallet as addWalletToVault, createVault } from '@/lib/vault/keyring';
import { vaultExists } from '@/lib/vault/storage';
import type { NetworkId } from '@/lib/networks';
import { useSettingsStore } from '@/stores/settings';
import { useWalletsStore } from '@/stores/wallets';

/**
 * Onboarding orchestration: vault + metadata in one step so the stores can
 * never disagree about what exists.
 */

export async function setupHotWallet(opts: {
  name: string;
  mnemonic: string;
  passphrase?: string;
  password: string;
}): Promise<string> {
  const mnemonic = normalizeMnemonic(opts.mnemonic);
  if (!isValidMnemonic(mnemonic)) throw new Error('Invalid seed phrase');

  const id = crypto.randomUUID();
  const secret = { id, mnemonic, passphrase: opts.passphrase || undefined };

  if (await vaultExists()) {
    await addWalletToVault(opts.password, secret);
  } else {
    await createVault(opts.password, secret);
  }

  useWalletsStore.getState().addWallet({
    id,
    name: opts.name.trim() || 'My wallet',
    type: 'hot',
    scriptType: 'p2wpkh',
    createdAt: Date.now(),
    backupVerified: false,
  });
  return id;
}

export function setupWatchWallet(opts: { name: string; input: string }): {
  id: string;
  network: NetworkId;
} {
  const parsed = parseWatchOnlyInput(opts.input);
  const id = crypto.randomUUID();

  useWalletsStore.getState().addWallet({
    id,
    name: opts.name.trim() || 'Watch-only',
    type: 'watch',
    scriptType: parsed.scriptHint ?? 'p2wpkh',
    createdAt: Date.now(),
    watchKey: parsed.key,
    watchNetwork: parsed.network,
  });

  // A watch key only exists on one network — follow it there.
  const settings = useSettingsStore.getState();
  if (settings.network !== parsed.network) settings.setNetwork(parsed.network);

  return { id, network: parsed.network };
}
