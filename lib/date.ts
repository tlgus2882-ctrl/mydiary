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
