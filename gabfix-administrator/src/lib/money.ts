/**
 * Money formatting (Phase 0.10 client split). Every amount in the workspace
 * renders through money(), and the currency follows the workspace profile
 * saved in Settings. No component formats currency on its own.
 */

/** Currency code used by every money() call. The Settings profile updates this at runtime. */
let activeCurrency = 'UGX';
export const setCurrency = (code: string) => { activeCurrency = code || 'UGX'; };

export const money = (value: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: activeCurrency, currencyDisplay: 'code', maximumFractionDigits: 0 }).format(value);

/** Whole-number formatting for CSV cells and inventory counts. */
export const plain = (value: number) => new Intl.NumberFormat('en-UG').format(Math.round(value));
