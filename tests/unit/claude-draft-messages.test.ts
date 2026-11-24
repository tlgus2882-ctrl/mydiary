import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";

// Captures the request so we can check the API never gets an assistant-final conversation (400 "prefill").
const h = vi.hoisted(() => ({ req: null as null | { messages: { role: string }[] } }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (req: { messages: { role: string }[] }) => {
        h.req = req;
        const ee = new EventEmitter();
        return { on: (e: string, f: (...a: unknown[]) => void) => ee.on(e, f), abort: vi.fn() };
      },
    };
  },
}));

import { writeDraft } from "@/lib/claude/client";

beforeEach(() => {
  process.env.ANTHROPIC_MODEL = "test-model";
  delete process.env.CLAUDE_FAKE;
  h.req = null;
});

it("draft request ends with a user turn when the conversation ended on a question", () => {
  writeDraft([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어" },
    { role: "assistant", content: "왜 좋으셨어요?" },
  ]);
  const msgs = h.req!.messages;
  expect(msgs[0].role).toBe("user");
  expect(msgs.at(-1)!.role).toBe("user");
});

it("draft request is unchanged at the end when the conversation ended on an answer", () => {
  writeDraft([
    { role: "assistant", content: "오늘 하루는 어떠셨나요?" },
    { role: "user", content: "좋았어" },
  ]);
  const msgs = h.req!.messages;
  expect(msgs.at(-1)!.role).toBe("user");
  expect(msgs).toHaveLength(3); // prepended start turn + 2
});
