import { btcToSats, satsToBtc } from './units';

export interface Bip21 {
  address: string;
  amountSats?: bigint;
  label?: string;
  message?: string;
}

/**
 * Parse a BIP21 payment URI ("bitcoin:ADDRESS?amount=0.01&label=...").
 * Address validity is NOT checked here — callers run checkAddress() so the
 * network-mismatch UX stays in one place. Returns null if this isn't a
 * bitcoin: URI; throws if it is one but is malformed or has required
 * extensions we don't understand (req-* params, per the BIP).
 */
export function parseBip21(uri: string): Bip21 | null {
  const match = /^bitcoin:([^?]*)(?:\?(.*))?$/i.exec(uri.trim());
  if (!match) return null;

  const address = decodeURIComponent(match[1]);
  if (!address) throw new Error('Payment link has no address');

  const result: Bip21 = { address };
  if (!match[2]) return result;

  const params = new URLSearchParams(match[2]);
  for (const [key] of params) {
    if (key.toLowerCase().startsWith('req-')) {
      throw new Error(`Payment link requires an unsupported feature (${key})`);
    }
  }

  const amount = params.get('amount');
  if (amount !== null) {
    try {
      result.amountSats = btcToSats(amount);
    } catch {
      throw new Error(`Payment link has an invalid amount ("${amount}")`);
    }
  }
  const label = params.get('label');
  if (label) result.label = label;
  const message = params.get('message');
  if (message) result.message = message;
  return result;
}

/** Build a BIP21 URI for the receive screen QR code. */
export function buildBip21({ address, amountSats, label, message }: Bip21): string {
  const params = new URLSearchParams();
  if (amountSats !== undefined && amountSats > 0n) params.set('amount', satsToBtc(amountSats));
  if (label) params.set('label', label);
  if (message) params.set('message', message);
  const query = params.toString();
  return `bitcoin:${address}${query ? `?${query}` : ''}`;
}
