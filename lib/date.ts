const DAY = 86_400_000;
const HOUR = 3_600_000;

// date is YYYY-MM-DD; accepted if it falls within the UTC dates of now-14h..now+14h (all timezones).
export function isAcceptableDate(date: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  const day = (ms: number) => Math.floor(ms / DAY) * DAY;
  return t >= day(now.getTime() - 14 * HOUR) && t <= day(now.getTime() + 14 * HOUR);
}

// The day before `date` (YYYY-MM-DD), or null if `date` is not a real calendar date.
export function previousDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return null;
  return new Date(t - DAY).toISOString().slice(0, 10);
}

// The browser's local calendar date (the user's "today", R6).
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
