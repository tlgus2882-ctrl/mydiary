const DAY = 86_400_000;

// Whole calendar days from lastDate to today (both YYYY-MM-DD), or null if there is no previous diary.
export function daysSinceLastDiary(lastDate: string | null, today: string): number | null {
  if (!lastDate) return null;
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / DAY);
}
