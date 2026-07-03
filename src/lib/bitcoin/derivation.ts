import { HDKey, type Versions } from '@scure/bip32';
import * as btc from '@scure/btc-signer';
import type { Chain, ScriptType } from './types';
import { getNetwork, type NetworkId } from '@/lib/networks';

/** BIP purpose per script type: BIP84 native SegWit, BIP86 taproot. */
export const PURPOSE: Record<ScriptType, number> = { p2wpkh: 84, p2tr: 86 };

/** Extended-key version bytes. @scure/bip32 defaults to mainnet (xprv/xpub). */
const MAINNET_VERSIONS: Versions = { private: 0x0488ade4, public: 0x0488b21e };
const TESTNET_VERSIONS: Versions = { private: 0x04358394, public: 0x043587cf };

export function versionsFor(networkId: NetworkId): Versions {
  return networkId === 'mainnet' ? MAINNET_VERSIONS : TESTNET_VERSIONS;
}

/** e.g. m/84'/0'/0' — the account level, the deepest hardened step. */
export function accountPath(scriptType: ScriptType, networkId: NetworkId, account = 0): string {
  return `m/${PURPOSE[scriptType]}'/${getNetwork(networkId).coinType}'/${account}'`;
}

/**
 * Derive the account-level node from a BIP39 seed. This is what the keyring
 * holds in memory while unlocked — enough to sign and derive addresses,
 * without keeping the seed (and therefore the mnemonic/passphrase) around.
 */
export function deriveAccount(
  seed: Uint8Array,
  scriptType: ScriptType,
  networkId: NetworkId,
  account = 0,
): HDKey {
  const root = HDKey.fromMasterSeed(seed, versionsFor(networkId));
  const node = root.derive(accountPath(scriptType, networkId, account));
  root.wipePrivateData();
  return node;
}

/**
 * Watch-only entry point: parse an account-level extended PUBLIC key.
 * Callers must first normalize SLIP-132 prefixes (zpub/vpub) via slip132.ts.
 */
export function accountFromExtendedKey(key: string, networkId: NetworkId): HDKey {
  return HDKey.fromExtendedKey(key, versionsFor(networkId));
}

export interface DerivedAddress {
  address: string;
  publicKey: Uint8Array;
  path: string;
  chain: Chain;
  index: number;
}

function addressFromPubkey(
  publicKey: Uint8Array,
  scriptType: ScriptType,
  networkId: NetworkId,
): string {
  const net = getNetwork(networkId).btc;
  const payment =
    scriptType === 'p2tr'
      ? btc.p2tr(publicKey.slice(1, 33), undefined, net) // x-only internal key, BIP86 tweak
      : btc.p2wpkh(publicKey, net);
  if (!payment.address) throw new Error('Failed to derive address');
  return payment.address;
}

/** The scriptPubKey for one of our own addresses (needed as witnessUtxo when spending). */
export function scriptForPubkey(
  publicKey: Uint8Array,
  scriptType: ScriptType,
  networkId: NetworkId,
): Uint8Array {
  const net = getNetwork(networkId).btc;
  const payment =
    scriptType === 'p2tr'
      ? btc.p2tr(publicKey.slice(1, 33), undefined, net)
      : btc.p2wpkh(publicKey, net);
  return payment.script;
}

/**
 * Derive one address from an account node (works for both private nodes and
 * watch-only public nodes — chain/index steps are non-hardened).
 */
export function deriveAddress(
  accountNode: HDKey,
  scriptType: ScriptType,
  networkId: NetworkId,
  chain: Chain,
  index: number,
): DerivedAddress {
  const node = accountNode.deriveChild(chain).deriveChild(index);
  if (!node.publicKey) throw new Error('Derivation produced no public key');
  return {
    address: addressFromPubkey(node.publicKey, scriptType, networkId),
    publicKey: node.publicKey,
    path: `${accountPath(scriptType, networkId)}/${chain}/${index}`,
    chain,
    index,
  };
}

/** Batch-derive a range of addresses (used by the gap-limit scanner). */
export function deriveAddressRange(
  accountNode: HDKey,
  scriptType: ScriptType,
  networkId: NetworkId,
  chain: Chain,
  start: number,
  count: number,
): DerivedAddress[] {
  const out: DerivedAddress[] = [];
  for (let i = start; i < start + count; i++) {
    out.push(deriveAddress(accountNode, scriptType, networkId, chain, i));
  }
  return out;
}

/**
 * Private key for signing one input. Throws for watch-only nodes.
 * Callers must not retain the returned bytes beyond the signing call.
 */
export function derivePrivateKey(accountNode: HDKey, chain: Chain, index: number): Uint8Array {
  const node = accountNode.deriveChild(chain).deriveChild(index);
  if (!node.privateKey) {
    throw new Error('This wallet is watch-only — it cannot sign transactions');
  }
  return node.privateKey;
}

/** Account xpub string (xpub/tpub serialization per network) for display/export. */
export function accountXpub(accountNode: HDKey): string {
  return accountNode.publicExtendedKey;
}
