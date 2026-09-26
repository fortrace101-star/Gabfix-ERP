/**
 * Africa/Kampala date handling for the admin app (Phase 0.9), mirroring
 * `server/lib/dates.ts` — the two must agree on what "today" means, or the
 * sidebar badge and the dashboard disagree about what is overdue.
 *
 * Dates are YYYY-MM-DD strings end to end. "Today" is the browser's real
 * calendar day (Ugandan users are on Ugandan time), and calendar arithmetic
 * happens on UTC dates built from that string so no timezone can shift it.
 */

/** Today's local date as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Calendar arithmetic on a YYYY-MM-DD string: addDays('2026-09-30', 1) is
 * '2026-10-01'. UTC math on the already-resolved local date keeps DST-less
 * Kampala dates stable.
 */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Maintenance is due when the scheduled day is today or earlier (day-boundary compare). */
export function isMaintenanceDue(nextMaintenance: string | null | undefined, today: string = todayISO()): boolean {
  return typeof nextMaintenance === 'string' && nextMaintenance.length > 0 && nextMaintenance <= today;
}

/**
 * Start of the selected reporting period as YYYY-MM-DD, computed on local
 * calendar days (the previous version mixed UTC instants with local weeks).
 */
export function periodStart(period: string, now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  switch (period) {
    case 'This day':
      return new Date(year, month, day).toISOString().slice(0, 10);
    case 'This week':
      return new Date(year, month, day - now.getDay()).toISOString().slice(0, 10);
    case 'This quarter':
      return new Date(year, Math.floor(month / 3) * 3, 1).toISOString().slice(0, 10);
    case 'This year':
      return new Date(year, 0, 1).toISOString().slice(0, 10);
    case 'This month':
    default:
      return new Date(year, month, 1).toISOString().slice(0, 10);
  }
}
