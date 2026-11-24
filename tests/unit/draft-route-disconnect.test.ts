import { beforeEach, expect, it, vi } from "vitest";
import { fakeSupabase } from "./fake-supabase";

const h = vi.hoisted(() => ({
  db: null as unknown,
  claude: null as null | ReadableStreamDefaultController<string>,
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => h.db }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => ({ rpc: async () => ({ data: "ok", error: null }) }),
}));
vi.mock("@/lib/claude/client", () => ({
  writeDraft: () => new ReadableStream<string>({ start: (c) => void (h.claude = c) }),
}));

import { POST } from "@/app/api/draft/route";

const turns = ["Q0", "A", "Q1", "A", "Q2", "A", "Q3", "A"].map((content, i) => ({
  role: i % 2 ? "user" : "assistant",
  content,
}));
let db: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  db = fakeSupabase({
    diaries: [{ id: "d1", status: "in_progress", title: "", body: "" }],
    diary_messages: turns,
  });
  h.db = db;
  h.claude = null;
});

const tick = () => new Promise((r) => setTimeout(r, 10));
const draftUpdates = () => db.calls.filter((c) => c.table === "diaries" && c.op === "update").map((c) => c.payload);

it("client disconnecting mid-draft still stores the full draft once Claude finishes", async () => {
  const pending = POST(new Request("http://x/api/draft", { method: "POST", body: JSON.stringify({ date: "2026-11-24" }) }));
  await tick();
  h.claude!.enqueue("제목\n");
  const res = await pending;
  const reader = res.body!.getReader();
  await reader.read();
  await reader.cancel(); // client gone
  h.claude!.enqueue("본문 첫 줄");
  h.claude!.enqueue(" 끝");
  h.claude!.close();
  await tick();
  expect(draftUpdates()).toEqual([{ title: "제목", body: "본문 첫 줄 끝", status: "drafted" }]);
});

it("Claude failing mid-draft stores the empty draft", async () => {
  const pending = POST(new Request("http://x/api/draft", { method: "POST", body: JSON.stringify({ date: "2026-11-24" }) }));
  await tick();
  h.claude!.enqueue("제목\n");
  const res = await pending;
  const reader = res.body!.getReader();
  await reader.read();
  h.claude!.error(new Error("boom"));
  await expect(reader.read()).rejects.toThrow();
  await tick();
  expect(draftUpdates()).toEqual([{ title: "", body: "", status: "drafted" }]);
});
