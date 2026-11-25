import {
  calculateDiscountPercent,
  calculateSavings,
  formatINR,
  multiplyCurrency,
  roundCurrency,
} from './currency';

describe('INR currency utilities', () => {
  it('computes exact savings without IEEE-754 floating-point drift', () => {
    expect(calculateSavings(64, 44.8)).toBe(19.2);
    expect(roundCurrency(19.199999999999996)).toBe(19.2);
    expect(calculateSavings(30, 35)).toBe(0);
  });

  it('computes integer discount percentage accurately', () => {
    expect(calculateDiscountPercent(100, 75)).toBe(25);
    expect(calculateDiscountPercent(33, 33)).toBe(0);
    expect(calculateDiscountPercent(0, 10)).toBe(0);
  });

  it('multiplies price by quantity accurately in paise', () => {
    expect(multiplyCurrency(19.2, 3)).toBe(57.6);
    expect(multiplyCurrency(33, 0)).toBe(0);
  });

  it('formats INR strings cleanly with Indian locale separators', () => {
    expect(formatINR(33)).toBe('₹33');
    expect(formatINR(19.2)).toBe('₹19.20');
    expect(formatINR(1250)).toBe('₹1,250');
  });
});
