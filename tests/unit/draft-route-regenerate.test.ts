import { beforeEach, expect, it, vi } from "vitest";
import { fakeSupabase } from "./fake-supabase";

const h = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => h.db }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => ({ rpc: async () => ({ data: "ok", error: null }) }),
}));
vi.mock("@/lib/claude/client", () => ({
  writeDraft: () =>
    new ReadableStream<string>({
      start(c) {
        c.enqueue("새 제목\n새 본문");
        c.close();
      },
    }),
}));

import { POST } from "@/app/api/draft/route";

const turns = ["Q0", "A", "Q1", "A", "Q2", "A", "Q3", "A"].map((content, i) => ({
  role: i % 2 ? "user" : "assistant",
  content,
}));
let db: ReturnType<typeof fakeSupabase>;
const post = (body: object) => POST(new Request("http://x/api/draft", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  db = fakeSupabase({
    diaries: [{ id: "d1", status: "saved", title: "옛 제목", body: "옛 본문" }],
    diary_messages: turns,
  });
  h.db = db;
});

it("regenerate:true on a saved non-empty diary stores a new draft, guarded by the content it read", async () => {
  const res = await post({ date: "2026-11-24", regenerate: true });
  expect(res.status).toBe(200);
  await res.text();
  const upd = db.calls.find((c) => c.table === "diaries" && c.op === "update")!;
  expect(upd.payload).toEqual({ title: "새 제목", body: "새 본문", status: "drafted" });
  expect(upd.filters).toEqual(
    expect.arrayContaining([["id", "d1"], ["status", "saved"], ["title", "옛 제목"], ["body", "옛 본문"]]),
  );
});

it("without regenerate a non-empty saved diary is still 409 and untouched", async () => {
  const res = await post({ date: "2026-11-24" });
  expect(res.status).toBe(409);
  expect(db.calls.some((c) => c.op === "update")).toBe(false);
});
