import * as btc from '@scure/btc-signer';
import type { OutputType } from './types';
import { getNetwork, type NetworkId } from '@/lib/networks';

export type AddressCheck =
  | { ok: true; type: OutputType; script: Uint8Array }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'wrong-network'; detected: NetworkId };

const TYPE_MAP: Record<string, OutputType> = {
  pkh: 'p2pkh',
  sh: 'p2sh',
  wpkh: 'p2wpkh',
  wsh: 'p2wsh',
  tr: 'p2tr',
};

/** BIP173 allows all-uppercase bech32 (QR alphanumeric mode); normalize it. */
function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  return /^(BC1|TB1)[0-9A-Z]+$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

function tryDecode(address: string, networkId: NetworkId) {
  try {
    const decoded = btc.Address(getNetwork(networkId).btc).decode(address);
    if (!decoded) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Validate an address for the given network. Distinguishes "not a valid
 * address at all" from "valid, but for the other network" so the UI can say
 * "this is a testnet address, but you're on mainnet".
 */
export function checkAddress(address: string, networkId: NetworkId): AddressCheck {
  const normalized = normalizeAddress(address);
  if (!normalized) return { ok: false, reason: 'invalid' };

  const decoded = tryDecode(normalized, networkId);
  if (decoded) {
    return {
      ok: true,
      type: TYPE_MAP[decoded.type] ?? 'unknown',
      script: btc.OutScript.encode(decoded),
    };
  }

  const other: NetworkId = networkId === 'mainnet' ? 'testnet4' : 'mainnet';
  if (tryDecode(normalized, other)) {
    return { ok: false, reason: 'wrong-network', detected: other };
  }
  return { ok: false, reason: 'invalid' };
}

/** Output type of a known-valid address (throws otherwise) — used for fee math. */
export function outputTypeOf(address: string, networkId: NetworkId): OutputType {
  const check = checkAddress(address, networkId);
  if (!check.ok) throw new Error(`Invalid address: ${address}`);
  return check.type;
}
