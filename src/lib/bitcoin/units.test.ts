import { describe, expect, it } from 'vitest';
import { btcToSats, formatSats, satsToBtc, satsToFiat } from './units';

describe('btcToSats', () => {
  it('converts whole and fractional amounts exactly', () => {
    expect(btcToSats('1')).toBe(100_000_000n);
    expect(btcToSats('0.00000001')).toBe(1n);
    expect(btcToSats('0.001')).toBe(100_000n);
    expect(btcToSats('21000000')).toBe(2_100_000_000_000_000n);
    expect(btcToSats(' 0.5 ')).toBe(50_000_000n);
  });

  it('rejects malformed input', () => {
    expect(() => btcToSats('abc')).toThrow();
    expect(() => btcToSats('1.')).toThrow();
    expect(() => btcToSats('.5')).toThrow();
    expect(() => btcToSats('1,5')).toThrow();
    expect(() => btcToSats('-1')).toThrow();
    expect(() => btcToSats('')).toThrow();
  });

  it('rejects more than 8 decimal places', () => {
    expect(() => btcToSats('0.123456789')).toThrow(/decimal/);
  });
});

describe('satsToBtc', () => {
  it('formats with trailing zeros trimmed', () => {
    expect(satsToBtc(150_000_000n)).toBe('1.5');
    expect(satsToBtc(1n)).toBe('0.00000001');
    expect(satsToBtc(100_000_000n)).toBe('1');
    expect(satsToBtc(0n)).toBe('0');
    expect(satsToBtc(-294n)).toBe('-0.00000294');
  });

  it('roundtrips with btcToSats', () => {
    for (const sats of [1n, 546n, 100_000n, 2_100_000_000_000_000n]) {
      expect(btcToSats(satsToBtc(sats))).toBe(sats);
    }
  });
});

describe('formatSats', () => {
  it('groups thousands', () => {
    expect(formatSats(1_234_567n)).toBe('1,234,567');
    expect(formatSats(0n)).toBe('0');
    expect(formatSats(999n)).toBe('999');
    expect(formatSats(-12_000n)).toBe('-12,000');
  });
});

describe('satsToFiat', () => {
  it('values sats at the given price, to cents', () => {
    expect(satsToFiat(100_000_000n, 50_000)).toBe(50_000);
    expect(satsToFiat(50_000n, 100_000)).toBe(50);
    expect(satsToFiat(1n, 100_000)).toBe(0);
  });
});
