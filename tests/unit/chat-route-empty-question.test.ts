import { beforeEach, expect, it, vi } from "vitest";
import { fakeSupabase } from "./fake-supabase";

const h = vi.hoisted(() => ({ db: null as unknown, reply: "" }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => h.db }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => ({ rpc: async () => ({ data: "ok", error: null }) }),
}));
vi.mock("@/lib/conversation/diary", () => ({
  findCurrentDiary: async (_s: unknown, date: string) => ({ id: "d1", entry_date: date, status: "in_progress" }),
}));
vi.mock("@/lib/claude/client", () => ({
  // what askNextQuestion hands back once the "MORE|" prefix is stripped
  askNextQuestion: async () => ({
    ready: false,
    stream: new ReadableStream<string>({
      start(c) {
        if (h.reply) c.enqueue(h.reply);
        c.close();
      },
    }),
  }),
}));

import { POST } from "@/app/api/chat/route";

const today = new Date().toISOString().slice(0, 10);
let db: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  db = fakeSupabase({
    diary_messages: [
      { role: "assistant", content: "오늘 하루는 어떠셨나요?", seq: 0, client_turn_id: null },
      { role: "user", content: "좋았어", seq: 1, client_turn_id: "t1" },
    ],
  });
  h.db = db;
});

const post = () =>
  POST(new Request("http://x/api/chat", {
    method: "POST",
    body: JSON.stringify({ date: today, answer: "좋았어", clientTurnId: "t1" }),
  }));
const assistantInserts = () =>
  db.calls.filter((c) => c.op === "insert" && (c.payload as { role?: string }).role === "assistant");

it("a question that is empty after the prefix is not stored, and the stream errors (client retries)", async () => {
  h.reply = " \n";
  const res = await post();
  expect(res.status).toBe(200);
  await expect(res.text()).rejects.toThrow();
  expect(assistantInserts()).toHaveLength(0);
});

it("a real question is stored", async () => {
  h.reply = "왜 좋으셨어요?";
  const res = await post();
  expect(await res.text()).toBe("왜 좋으셨어요?");
  expect(assistantInserts()).toHaveLength(1);
});
