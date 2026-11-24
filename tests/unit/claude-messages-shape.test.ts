import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";

type Req = { messages: { role: string; content: string }[] };
const h = vi.hoisted(() => ({ req: null as null | Req }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (req: Req) => {
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

const alternates = (msgs: { role: string }[]) =>
  msgs.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant"));

it("an empty stored question is dropped and the two answers around it are joined", () => {
  void askNextQuestion([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어" },
    { role: "assistant", content: "  " },
    { role: "user", content: "산책했어" },
  ]);
  const msgs = h.req!.messages;
  expect(msgs.every((m) => m.content.trim() !== "")).toBe(true);
  expect(alternates(msgs)).toBe(true);
  expect(msgs.at(-1)!.content).toContain("좋았어");
  expect(msgs.at(-1)!.content).toContain("산책했어");
});

it("a conversation ending on an empty question still ends on a user turn for drafts", () => {
  writeDraft([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어" },
    { role: "assistant", content: "" },
  ]);
  const msgs = h.req!.messages;
  expect(msgs.every((m) => m.content.trim() !== "")).toBe(true);
  expect(alternates(msgs)).toBe(true);
});

it("the closing draft turn is an instruction, not wrapped as an <answer>", () => {
  writeDraft([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어" },
    { role: "assistant", content: "왜 좋으셨어요?" },
  ]);
  const last = h.req!.messages.at(-1)!;
  expect(last.role).toBe("user");
  expect(last.content).not.toContain("<answer>");
  expect(h.req!.messages[2].content).toBe("<answer>좋았어</answer>");
});
