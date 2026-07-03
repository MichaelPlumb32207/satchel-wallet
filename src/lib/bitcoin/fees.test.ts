import { describe, expect, it } from 'vitest';
import { dustThreshold, estimateFee, estimateVsize, inputCost } from './fees';

describe('estimateVsize', () => {
  it('matches known sizes for common P2WPKH shapes', () => {
    expect(estimateVsize(['p2wpkh'], ['p2wpkh'])).toBe(110);
    expect(estimateVsize(['p2wpkh'], ['p2wpkh', 'p2wpkh'])).toBe(141);
    expect(estimateVsize(['p2wpkh', 'p2wpkh'], ['p2wpkh', 'p2wpkh'])).toBe(209);
  });

  it('accounts for taproot input/output sizes', () => {
    expect(estimateVsize(['p2tr'], ['p2tr'])).toBe(111);
    // taproot inputs are smaller than p2wpkh inputs
    expect(estimateVsize(['p2tr'], ['p2wpkh'])).toBeLessThan(
      estimateVsize(['p2wpkh'], ['p2wpkh']),
    );
  });

  it('prices legacy outputs correctly', () => {
    // p2pkh output is 3 vB larger than p2wpkh output
    expect(
      estimateVsize(['p2wpkh'], ['p2pkh']) - estimateVsize(['p2wpkh'], ['p2wpkh']),
    ).toBe(3);
  });
});

describe('estimateFee', () => {
  it('multiplies vsize by the rate, rounding up', () => {
    expect(estimateFee(['p2wpkh'], ['p2wpkh'], 1)).toBe(110n);
    expect(estimateFee(['p2wpkh'], ['p2wpkh'], 10)).toBe(1100n);
    expect(estimateFee(['p2wpkh'], ['p2wpkh'], 1.5)).toBe(165n);
    expect(estimateFee(['p2wpkh'], ['p2wpkh'], 1.01)).toBe(112n); // ceil(111.1)
  });

  it('rejects nonsense rates', () => {
    expect(() => estimateFee(['p2wpkh'], ['p2wpkh'], 0)).toThrow();
    expect(() => estimateFee(['p2wpkh'], ['p2wpkh'], -1)).toThrow();
    expect(() => estimateFee(['p2wpkh'], ['p2wpkh'], NaN)).toThrow();
  });
});

describe('dustThreshold', () => {
  it('uses per-type thresholds, not one magic number', () => {
    expect(dustThreshold('p2wpkh')).toBe(294n);
    expect(dustThreshold('p2pkh')).toBe(546n);
    expect(dustThreshold('p2tr')).toBe(330n);
  });
});

describe('inputCost', () => {
  it('is the marginal fee of one input', () => {
    expect(inputCost('p2wpkh', 1)).toBe(68n);
    expect(inputCost('p2tr', 1)).toBe(58n); // ceil(57.5)
    expect(inputCost('p2wpkh', 10)).toBe(680n);
  });
});
