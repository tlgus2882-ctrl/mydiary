import { askNextQuestion } from "@/lib/claude/client";
import type { Turn } from "@/lib/claude/protocol";
import { findCurrentDiary } from "@/lib/conversation/diary";
import { FIRST_QUESTION, nextAction, validateAnswer } from "@/lib/conversation/rules";
import { isAcceptableDate, previousDate } from "@/lib/date";
import { quotaLimits } from "@/lib/quota";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

type Msg = { role: Turn["role"]; content: string; seq: number; client_turn_id: string | null };

const json = (body: object, status: number) => Response.json(body, { status });

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const { date, answer, clientTurnId } = (body ?? {}) as Record<string, unknown>;
  const valid = validateAnswer(typeof answer === "string" ? answer : "");
  if (!valid.ok) return json({ reason: valid.reason }, 400);
  if (typeof clientTurnId !== "string" || !clientTurnId || clientTurnId.length > 100) {
    return json({ reason: "bad_turn_id" }, 400);
  }
  const prev = typeof date === "string" ? previousDate(date) : null;
  if (!prev) return json({ reason: "bad_date" }, 400);

  // 1. diary: continue yesterday's in-progress one across midnight (keeps its entry_date), else today's
  const now = new Date();
  let found = await findCurrentDiary(supabase, date as string, prev, now);
  const crossedMidnight = found?.entry_date === prev;
  if (!crossedMidnight && !isAcceptableDate(date as string, now)) return json({ reason: "bad_date" }, 400);
  if (found && found.status !== "in_progress") {
    return json({ reason: "already_written", date: found.entry_date }, 409);
  }
  if (!found) {
    const { error } = await supabase.from("diaries").insert({ entry_date: date });
    if (error && error.code !== "23505") throw error; // 23505: a concurrent request created it
    found = await findCurrentDiary(supabase, date as string, prev, now);
    if (!found) throw new Error("diary not found after insert");
  }
  // always (not only on create): a request that died between creating the diary and this line left no seq 0
  const first = await supabase
    .from("diary_messages")
    .upsert(
      { diary_id: found.id, role: "assistant", content: FIRST_QUESTION, seq: 0 },
      { onConflict: "diary_id,seq", ignoreDuplicates: true },
    );
  if (first.error) throw first.error;

  const diary = found;

  // 2. save the answer before calling Claude, once per clientTurnId (RF2, R14)
  const load = async () => {
    const { data, error } = await supabase
      .from("diary_messages")
      .select("role, content, seq, client_turn_id")
      .eq("diary_id", diary.id)
      .order("seq");
    if (error) throw error;
    return data as Msg[];
  };
  let msgs = await load();
  let idx = msgs.findIndex((m) => m.client_turn_id === clientTurnId);
  if (idx === -1) {
    const seq = (msgs.at(-1)?.seq ?? 0) + 1;
    const { error } = await supabase
      .from("diary_messages")
      .insert({ diary_id: diary.id, role: "user", content: valid.value, seq, client_turn_id: clientTurnId });
    if (error && error.code !== "23505") throw error;
    const touch = await supabase.from("diaries").update({ updated_at: now.toISOString() }).eq("id", diary.id);
    if (touch.error) throw touch.error;
    msgs = await load();
    idx = msgs.findIndex((m) => m.client_turn_id === clientTurnId);
    if (idx === -1) return json({ reason: "conflict" }, 409); // seq taken by another turn; client can retry
  }

  const asked = msgs.slice(0, idx + 1).filter((m) => m.role === "assistant").length - 1;
  const headers = (followUps: number, next: string) => ({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Follow-Ups": String(followUps),
    "X-Next": next,
    "X-Diary-Date": diary.entry_date,
  });

  // 3. this turn was already answered (response lost, client retried): replay instead of regenerating
  const reply = msgs[idx + 1];
  if (reply?.role === "assistant") return new Response(reply.content, { headers: headers(asked + 1, "ask") });

  if (nextAction(asked, false) === "draft") return new Response(null, { headers: headers(asked, "draft") });

  // 4. quota, keyed on the server-verified user only
  const quota = await createAdminSupabase().rpc("consume_quota", {
    p_user_id: user.id,
    p_kind: "question",
    ...quotaLimits(),
  });
  if (quota.error) throw quota.error;
  if (quota.data !== "ok") return json({ reason: quota.data }, 429);

  // 5. stream the question; store it only once the stream completes
  const history: Turn[] = msgs.slice(0, idx + 1).map(({ role, content }) => ({ role, content }));
  const { ready, stream } = await askNextQuestion(history);
  let text = "";
  const out = stream
    .pipeThrough(
      new TransformStream<string, string>({
        transform(chunk, c) {
          text += chunk;
          c.enqueue(chunk);
        },
        async flush() {
          const { error } = await supabase
            .from("diary_messages")
            .insert({ diary_id: diary.id, role: "assistant", content: text.trim(), seq: msgs[idx].seq + 1 });
          if (error) throw error;
        },
      }),
    )
    .pipeThrough(new TextEncoderStream());
  return new Response(out, { headers: headers(asked + 1, nextAction(asked, ready)) });
}
