import { describe, expect, it } from 'vitest';
import { buildBip21, parseBip21 } from './bip21';

const ADDR = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

describe('parseBip21', () => {
  it('parses address-only URIs', () => {
    expect(parseBip21(`bitcoin:${ADDR}`)).toEqual({ address: ADDR });
  });

  it('parses amount, label, and message', () => {
    const parsed = parseBip21(`bitcoin:${ADDR}?amount=0.001&label=Coffee%20Fund&message=thanks`);
    expect(parsed).toEqual({
      address: ADDR,
      amountSats: 100_000n,
      label: 'Coffee Fund',
      message: 'thanks',
    });
  });

  it('is case-insensitive on the scheme', () => {
    expect(parseBip21(`BITCOIN:${ADDR}`)?.address).toBe(ADDR);
  });

  it('returns null for non-URIs (plain addresses)', () => {
    expect(parseBip21(ADDR)).toBeNull();
    expect(parseBip21('lightning:lnbc1...')).toBeNull();
  });

  it('throws on unsupported required params (per BIP21)', () => {
    expect(() => parseBip21(`bitcoin:${ADDR}?req-payjoin=1`)).toThrow(/unsupported/);
  });

  it('throws on invalid amounts', () => {
    expect(() => parseBip21(`bitcoin:${ADDR}?amount=abc`)).toThrow(/amount/);
    expect(() => parseBip21(`bitcoin:${ADDR}?amount=0.123456789`)).toThrow(/amount/);
  });

  it('throws on an empty address', () => {
    expect(() => parseBip21('bitcoin:?amount=1')).toThrow(/no address/);
  });
});

describe('buildBip21', () => {
  it('builds and roundtrips through parse', () => {
    const uri = buildBip21({ address: ADDR, amountSats: 123_456n, label: 'Café tab' });
    expect(uri.startsWith(`bitcoin:${ADDR}?`)).toBe(true);
    expect(parseBip21(uri)).toEqual({
      address: ADDR,
      amountSats: 123_456n,
      label: 'Café tab',
    });
  });

  it('omits the query string when there is nothing to add', () => {
    expect(buildBip21({ address: ADDR })).toBe(`bitcoin:${ADDR}`);
    expect(buildBip21({ address: ADDR, amountSats: 0n })).toBe(`bitcoin:${ADDR}`);
  });
});
