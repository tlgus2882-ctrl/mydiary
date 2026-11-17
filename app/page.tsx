import { cookies } from "next/headers";
import { findCurrentDiary } from "@/lib/conversation/diary";
import { previousDate } from "@/lib/date";
import { requireUser } from "@/lib/supabase/server";
import { GoIfToday } from "./TzDate";

export default async function Home() {
  const { supabase } = await requireUser();
  const date = (await cookies()).get("tz-date")?.value ?? "";
  const prev = previousDate(date);
  if (!prev) return null; // <TzDate> sets the cookie and refreshes
  const diary = await findCurrentDiary(supabase, date, prev);
  const to = !diary || diary.status === "in_progress" ? "/chat" : `/diary/${diary.entry_date}`;
  return <GoIfToday date={date} to={to} />;
}
