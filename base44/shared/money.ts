// Single source of truth for GBP <-> Stripe minor-unit conversion.
// Stripe stores amounts in the smallest currency unit (pence for GBP):
//   £305.00 -> 30500,  £19.99 -> 1999
// Every payment path must use these helpers. Never do the *100 arithmetic
// inline — float drift here becomes refund disputes.

const PENCE_PER_POUND = 100;

// Convert a pound amount (e.g. 305.00) to Stripe minor units (30500).
export function toMinorUnits(amountPounds) {
  if (!Number.isFinite(amountPounds)) {
    throw new Error(`Invalid amount (not a finite number): ${amountPounds}`);
  }
  if (amountPounds < 0) {
    throw new Error(`Negative amount not allowed: ${amountPounds}`);
  }
  // Math.round absorbs float drift: 19.99 * 100 = 1998.9999... -> 1999
  return Math.round(amountPounds * PENCE_PER_POUND);
}

// Convert Stripe minor units (30500) back to a pound amount (305.00).
export function fromMinorUnits(amountMinor) {
  if (!Number.isFinite(amountMinor)) {
    throw new Error(`Invalid minor-unit amount (not a finite number): ${amountMinor}`);
  }
  return amountMinor / PENCE_PER_POUND;
}