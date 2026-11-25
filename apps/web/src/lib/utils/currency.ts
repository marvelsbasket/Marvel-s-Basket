/**
 * Exact INR monetary helpers avoiding IEEE-754 floating-point artifacts
 * (e.g., 64 - 44.8 => 19.2, never 19.199999999999996).
 */

export function toPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromPaise(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

export function roundCurrency(amount: number): number {
  return fromPaise(toPaise(amount));
}

export function calculateSavings(mrp: number, sellingPrice: number): number {
  const diffPaise = toPaise(mrp) - toPaise(sellingPrice);
  return diffPaise > 0 ? fromPaise(diffPaise) : 0;
}

export function calculateDiscountPercent(mrp: number, sellingPrice: number): number {
  const mrpPaise = toPaise(mrp);
  const sellingPaise = toPaise(sellingPrice);
  if (mrpPaise <= 0 || sellingPaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - sellingPaise) / mrpPaise) * 100);
}

export function multiplyCurrency(unitPrice: number, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return fromPaise(toPaise(unitPrice) * Math.round(quantity));
}

export function formatINR(amount: number, options?: { showDecimals?: boolean }): string {
  const rounded = roundCurrency(amount);
  const paise = toPaise(rounded);
  const hasFraction = paise % 100 !== 0;

  const minFractionDigits = options?.showDecimals === true ? 2 : hasFraction ? 2 : 0;
  const maxFractionDigits =
    options?.showDecimals === false ? 0 : hasFraction ? 2 : options?.showDecimals ? 2 : 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(rounded);
}
