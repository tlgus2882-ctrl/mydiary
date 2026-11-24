import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";

// Thinking tokens count toward max_tokens on current models; tight limits cut the visible text mid-sentence (#46).
const h = vi.hoisted(() => ({ req: null as null | { max_tokens: number } }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (req: { max_tokens: number }) => {
        h.req = req;
        const ee = new EventEmitter();
        return { on: (e: string, f: (...a: unknown[]) => void) => ee.on(e, f), abort: vi.fn() };
      },
    };
  },
}));

import { askNextQuestion, writeDraft } from "@/lib/claude/client";

beforeEach(() => {
  process.env.ANTHROPIC_MODEL = "test-model";
  delete process.env.CLAUDE_FAKE;
  h.req = null;
});

it("question requests leave room for thinking (>= 4000 max_tokens)", () => {
  void askNextQuestion([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어요" },
  ]).catch(() => {});
  expect(h.req!.max_tokens).toBeGreaterThanOrEqual(4000);
});

it("draft requests leave room for thinking and a long diary (>= 16000 max_tokens)", () => {
  writeDraft([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어요" },
  ]);
  expect(h.req!.max_tokens).toBeGreaterThanOrEqual(16000);
});
