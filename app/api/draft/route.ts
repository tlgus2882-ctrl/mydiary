import { writeDraft } from "@/lib/claude/client";
import { splitDraft, type Turn } from "@/lib/claude/protocol";
import { canFinishEarly, MAX_FOLLOW_UPS } from "@/lib/conversation/rules";
import { quotaLimits } from "@/lib/quota";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const json = (body: object, status: number) => Response.json(body, { status });

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const { date } = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (typeof date !== "string") return json({ reason: "bad_date" }, 400);

  // RLS scopes this to the user's own diaries
  const found = await supabase.from("diaries").select("id, status, title, body").eq("entry_date", date).maybeSingle();
  if (found.error) throw found.error;
  const diary = found.data;
  if (!diary) return json({ reason: "not_found" }, 404);
  // a failed draft (status drafted, nothing in it) may be retried; nothing else may be regenerated
  const retry = diary.status === "drafted" && diary.title === "" && diary.body === "";
  if (diary.status !== "in_progress" && !retry) return json({ reason: "not_in_progress" }, 409);

  const { data, error } = await supabase.from("diary_messages").select("role, content").eq("diary_id", diary.id).order("seq");
  if (error) throw error;
  const history = data as Turn[];
  const followUps = history.filter((m) => m.role === "assistant").length - 1; // same count as the chat route
  if (!canFinishEarly(followUps) && followUps < MAX_FOLLOW_UPS) return json({ reason: "too_early" }, 400);

  const store = async (title: string, body: string) => {
    const { error } = await supabase.from("diaries").update({ title, body, status: "drafted" }).eq("id", diary.id);
    if (error) throw error;
  };
  const fallback = async () => {
    await store("", "");
    return json({ fallback: true }, 200);
  };

  const quota = await createAdminSupabase().rpc("consume_quota", {
    p_user_id: user.id,
    p_kind: "draft",
    ...quotaLimits(),
  });
  if (quota.error) throw quota.error;
  if (quota.data !== "ok") return fallback();

  // read the first chunk before answering, so a Claude failure can still become the JSON fallback
  const encoder = new TextEncoder();
  let reader: ReadableStreamDefaultReader<string>;
  let first: ReadableStreamReadResult<string>;
  try {
    reader = writeDraft(history).getReader();
    first = await reader.read();
  } catch {
    return fallback();
  }

  let text = "";
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let r = first; !r.done; r = await reader.read()) {
          text += r.value;
          controller.enqueue(encoder.encode(r.value));
        }
        const { title, body } = splitDraft(text);
        await store(title, body);
        controller.close();
      } catch (e) {
        await store("", "").catch(() => {});
        controller.error(e);
      }
    },
  });
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
