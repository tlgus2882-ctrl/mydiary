import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askNextQuestion, writeDraft } from "@/lib/claude/client";
import type { Turn } from "@/lib/claude/protocol";

async function readAll(s: ReadableStream<string>) {
  let out = "";
  const r = s.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) return out;
    out += value;
  }
}

// first fixed question + (user, assistant) pairs; assistant turns - 1 = follow-ups so far
function history(assistantTurns: number): Turn[] {
  const h: Turn[] = [{ role: "assistant", content: "오늘 하루는 어떠셨나요?" }];
  for (let i = 1; i < assistantTurns; i++) {
    h.push({ role: "user", content: "답" }, { role: "assistant", content: "질문" });
  }
  h.push({ role: "user", content: "답" });
  return h;
}

describe("fake mode (CLAUDE_FAKE=1)", () => {
  beforeEach(() => {
    vi.stubEnv("CLAUDE_FAKE", "1");
    vi.stubGlobal("fetch", () => {
      throw new Error("network used");
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("first follow-up is not ready", async () => {
    const r = await askNextQuestion(history(1));
    expect(r.ready).toBe(false);
    expect(await readAll(r.stream)).toBe("그때 기분이 어떠셨어요? (가짜 질문 1)");
  });
  it("ready is false for follow-up 2 and true from follow-up 3", async () => {
    expect((await askNextQuestion(history(2))).ready).toBe(false);
    const r = await askNextQuestion(history(3));
    expect(r.ready).toBe(true);
    expect(await readAll(r.stream)).toBe("그때 기분이 어떠셨어요? (가짜 질문 3)");
    expect((await askNextQuestion(history(4))).ready).toBe(true);
  });
  it("writeDraft returns the fake draft", async () => {
    expect(await readAll(writeDraft(history(3)))).toBe("가짜 제목\n가짜 본문");
  });
});
