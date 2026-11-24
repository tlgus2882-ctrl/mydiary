import { beforeEach, expect, it, vi } from "vitest";

// Uses the SDK's real MessageStream so the abort path is the installed SDK's, not a copy of it.
vi.mock("@anthropic-ai/sdk", async () => {
  const { MessageStream } = await import("@anthropic-ai/sdk/lib/MessageStream");
  const messages = {
    // a request that hangs until aborted, like a real in-flight fetch
    create: (_p: unknown, opts: { signal: AbortSignal }) => ({
      withResponse: () =>
        new Promise((_, reject) =>
          opts.signal.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
    }),
  };
  return {
    default: class {
      messages = { stream: (params: never) => MessageStream.createMessage(messages as never, params) };
    },
  };
});

import { writeDraft } from "@/lib/claude/client";

beforeEach(() => {
  process.env.ANTHROPIC_MODEL = "test-model";
  delete process.env.CLAUDE_FAKE;
});

it("cancelling our stream (client gone) aborts the SDK stream without an unhandled rejection", async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (e: unknown) => unhandled.push(e);
  process.on("unhandledRejection", onUnhandled);
  try {
    const r = writeDraft([{ role: "user", content: "좋았어" }]).getReader();
    await r.cancel();
    await new Promise((res) => setTimeout(res, 20));
    expect(unhandled).toEqual([]);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});
