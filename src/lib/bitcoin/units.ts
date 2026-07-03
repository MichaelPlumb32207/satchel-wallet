export const SATS_PER_BTC = 100_000_000n;
const BTC_DECIMALS = 8;

/**
 * Parse a BTC decimal string ("0.00012345") into satoshis.
 * String math throughout — never floats — so amounts are exact.
 * Throws on malformed input or more than 8 decimal places.
 */
export function btcToSats(btc: string): bigint {
  const trimmed = btc.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new Error(`Invalid BTC amount: "${btc}"`);
  const [, whole, frac = ''] = match;
  if (frac.length > BTC_DECIMALS) {
    throw new Error(`Too many decimal places (max ${BTC_DECIMALS}): "${btc}"`);
  }
  return BigInt(whole) * SATS_PER_BTC + BigInt(frac.padEnd(BTC_DECIMALS, '0'));
}

/** Format satoshis as a BTC decimal string with trailing zeros trimmed ("0.0001"). */
export function satsToBtc(sats: bigint): string {
  const negative = sats < 0n;
  const abs = negative ? -sats : sats;
  const whole = abs / SATS_PER_BTC;
  const frac = (abs % SATS_PER_BTC).toString().padStart(BTC_DECIMALS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** Format satoshis with thousands separators: 1234567n -> "1,234,567". */
export function formatSats(sats: bigint): string {
  const negative = sats < 0n;
  const digits = (negative ? -sats : sats).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}`;
}

/** Fiat value of `sats` at `pricePerBtc`, rounded to cents. */
export function satsToFiat(sats: bigint, pricePerBtc: number): number {
  return Math.round((Number(sats) / Number(SATS_PER_BTC)) * pricePerBtc * 100) / 100;
}
