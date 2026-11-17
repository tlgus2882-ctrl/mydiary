import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findCurrentDiary } from "@/lib/conversation/diary";
import { previousDate } from "@/lib/date";
import { requireUser } from "@/lib/supabase/server";

export default async function Home() {
  const { supabase } = await requireUser();
  const date = (await cookies()).get("tz-date")?.value ?? "";
  const prev = previousDate(date);
  if (!prev) return null; // <TzDate> sets the cookie and reloads
  const diary = await findCurrentDiary(supabase, date, prev);
  redirect(!diary || diary.status === "in_progress" ? "/chat" : `/diary/${diary.entry_date}`);
}
