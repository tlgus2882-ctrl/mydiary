import type { SupabaseClient } from "@supabase/supabase-js";

export type Diary = { id: string; entry_date: string; status: "in_progress" | "drafted" | "saved" };

// The diary the user is on for `date`: that day's diary (any status), or yesterday's
// conversation still in progress (the user crossed midnight mid-conversation, RF4). RLS scopes it to the user.
export async function findCurrentDiary(
  supabase: SupabaseClient,
  date: string,
  prev: string,
): Promise<Diary | null> {
  const { data, error } = await supabase
    .from("diaries")
    .select("id, entry_date, status")
    .in("entry_date", [date, prev]);
  if (error) throw error;
  const rows = data as Diary[];
  return (
    rows.find((d) => d.entry_date === date) ??
    rows.find((d) => d.status === "in_progress") ??
    null
  );
}
