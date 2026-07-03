import { createBase58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';
import type { NetworkId } from '@/lib/networks';
import type { ScriptType } from './types';

const base58check = createBase58check(sha256);

/** Extended-key serialization version bytes (SLIP-132 + BIP32). */
const VERSION_BYTES = {
  xpub: 0x0488b21e,
  tpub: 0x043587cf,
  zpub: 0x04b24746, // BIP84 p2wpkh, mainnet
  vpub: 0x045f1cf6, // BIP84 p2wpkh, testnet
  ypub: 0x049d7cb2, // BIP49 nested segwit, mainnet — unsupported
  upub: 0x044a5262, // BIP49 nested segwit, testnet — unsupported
} as const;

type KnownPrefix = keyof typeof VERSION_BYTES;

const PREFIX_INFO: Record<KnownPrefix, { network: NetworkId; scriptHint: ScriptType | null }> = {
  xpub: { network: 'mainnet', scriptHint: null }, // path unknown; v1 UI assumes BIP84 usage
  tpub: { network: 'testnet4', scriptHint: null },
  zpub: { network: 'mainnet', scriptHint: 'p2wpkh' },
  vpub: { network: 'testnet4', scriptHint: 'p2wpkh' },
  ypub: { network: 'mainnet', scriptHint: null },
  upub: { network: 'testnet4', scriptHint: null },
};

export interface ParsedWatchKey {
  /** Normalized to standard BIP32 serialization (xpub or tpub) for @scure/bip32. */
  key: string;
  network: NetworkId;
  /** Script type implied by the SLIP-132 prefix, if any. */
  scriptHint: ScriptType | null;
}

function readVersion(bytes: Uint8Array): number {
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function writeVersion(bytes: Uint8Array, version: number): Uint8Array {
  const out = bytes.slice();
  out[0] = (version >>> 24) & 0xff;
  out[1] = (version >>> 16) & 0xff;
  out[2] = (version >>> 8) & 0xff;
  out[3] = version & 0xff;
  return out;
}

/** Swap SLIP-132 version bytes, e.g. zpub -> xpub. Content is otherwise identical. */
export function convertVersion(key: string, target: 'xpub' | 'tpub' | 'zpub' | 'vpub'): string {
  const bytes = base58check.decode(key);
  if (bytes.length !== 78) throw new Error('Not an extended key (wrong length)');
  return base58check.encode(writeVersion(bytes, VERSION_BYTES[target]));
}

/**
 * Parse user input for watch-only import: a bare extended public key
 * (xpub/tpub/zpub/vpub) or a simple wpkh() descriptor wrapping one.
 * Throws with a user-presentable message on anything else.
 */
export function parseWatchOnlyInput(input: string): ParsedWatchKey {
  let raw = input.trim();

  // Strip descriptor checksum suffix ("#8j2t9lqs") if present.
  raw = raw.replace(/#[a-z0-9]{8}$/, '');

  // Simple wpkh() descriptor: wpkh([fingerprint/84h/0h/0h]xpub.../0/*)
  const descriptor = /^wpkh\(\s*(?:\[[^\]]*\])?([1-9A-HJ-NP-Za-km-z]+)(?:\/[01]\/\*)?\s*\)$/.exec(raw);
  if (descriptor) {
    const parsed = parseBareKey(descriptor[1]);
    return { ...parsed, scriptHint: 'p2wpkh' };
  }

  return parseBareKey(raw);
}

function parseBareKey(raw: string): ParsedWatchKey {
  const prefix = raw.slice(0, 4);

  if (/^[xtyzuv]prv$/.test(prefix)) {
    throw new Error(
      'That looks like a PRIVATE key (xprv). Never share it — to use this wallet here, import its seed phrase instead.',
    );
  }
  if (prefix === 'ypub' || prefix === 'upub') {
    throw new Error('Nested SegWit (ypub/upub) wallets are not supported yet.');
  }
  if (!(prefix in VERSION_BYTES)) {
    throw new Error('Not a recognized extended public key (expected xpub, tpub, zpub, or vpub).');
  }

  let bytes: Uint8Array;
  try {
    bytes = base58check.decode(raw);
  } catch {
    throw new Error('Invalid extended key (bad checksum or characters).');
  }
  if (bytes.length !== 78) throw new Error('Invalid extended key (wrong length).');
  if (readVersion(bytes) !== VERSION_BYTES[prefix as KnownPrefix]) {
    throw new Error('Extended key version bytes do not match its prefix.');
  }

  const { network, scriptHint } = PREFIX_INFO[prefix as KnownPrefix];
  const target = network === 'mainnet' ? 'xpub' : 'tpub';
  return {
    key: prefix === target ? raw : convertVersion(raw, target),
    network,
    scriptHint,
  };
}
