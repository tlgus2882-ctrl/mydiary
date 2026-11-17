import type { SupabaseClient } from "@supabase/supabase-js";

export type Diary = { id: string; entry_date: string; status: "in_progress" | "drafted" | "saved" };

// Yesterday's conversation counts as "crossed midnight" only if it was touched this recently.
const MIDNIGHT_GRACE_MS = 6 * 3_600_000;

// The diary the user is on for `date`: that day's diary (any status), or yesterday's
// conversation still in progress and recently active (crossed midnight, RF4). RLS scopes it to the user.
export async function findCurrentDiary(
  supabase: SupabaseClient,
  date: string,
  prev: string,
  now = new Date(),
): Promise<Diary | null> {
  const { data, error } = await supabase
    .from("diaries")
    .select("id, entry_date, status, updated_at")
    .in("entry_date", [date, prev]);
  if (error) throw error;
  const rows = data as (Diary & { updated_at: string })[];
  const recent = (d: { updated_at: string }) => now.getTime() - Date.parse(d.updated_at) <= MIDNIGHT_GRACE_MS;
  return (
    rows.find((d) => d.entry_date === date) ??
    rows.find((d) => d.status === "in_progress" && recent(d)) ??
    null
  );
}
