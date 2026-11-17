import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Turn } from "@/lib/claude/protocol";
import { findCurrentDiary } from "@/lib/conversation/diary";
import { FIRST_QUESTION } from "@/lib/conversation/rules";
import { previousDate } from "@/lib/date";
import { requireUser } from "@/lib/supabase/server";
import { ChatView } from "./ChatView";

export default async function ChatPage() {
  const { supabase, user } = await requireUser();
  const date = (await cookies()).get("tz-date")?.value ?? "";
  const prev = previousDate(date);
  if (!prev) return null; // <TzDate> sets the cookie and refreshes
  const diary = await findCurrentDiary(supabase, date, prev);
  if (diary && diary.status !== "in_progress") redirect(`/diary/${diary.entry_date}`);

  let turns: Turn[] = [{ role: "assistant", content: FIRST_QUESTION }];
  let unanswered: { id: string; text: string } | null = null;
  if (diary) {
    const { data, error } = await supabase
      .from("diary_messages")
      .select("role, content, client_turn_id")
      .eq("diary_id", diary.id)
      .order("seq");
    if (error) throw error;
    turns = data.map(({ role, content }) => ({ role, content }));
    const last = data.at(-1);
    // the last answer never got a question back: offer to retry it with the same turn id (R14)
    if (last?.role === "user") {
      turns.pop();
      unanswered = { id: last.client_turn_id, text: last.content };
    }
  }
  return (
    <ChatView key={date} email={user.email ?? ""} initialTurns={turns} unanswered={unanswered} diaryDate={diary?.entry_date ?? null} />
  );
}
