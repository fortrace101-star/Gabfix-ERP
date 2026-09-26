/** Month-key helpers shared by the laundry, finance and reports views. */

/** YYYY-MM key of a YYYY-MM-DD string (empty-safe). */
export const monthKeyOf = (date: string) => (date || '').slice(0, 7);

/** "September 2026" style label for a YYYY-MM key. */
export const monthName = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
