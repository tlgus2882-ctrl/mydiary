import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { stream: () => h.current };
  },
}));

import { askNextQuestion, writeDraft } from "@/lib/claude/client";

function mockStream() {
  const ee = new EventEmitter();
  const abort = vi.fn();
  h.current = { on: (e: string, f: (...a: unknown[]) => void) => ee.on(e, f), abort };
  return { ee, abort };
}

async function readAll(r: ReadableStreamDefaultReader<string>) {
  let s = "";
  for (;;) {
    const { done, value } = await r.read();
    if (done) return s;
    s += value;
  }
}

beforeEach(() => {
  process.env.ANTHROPIC_MODEL = "test-model";
  delete process.env.CLAUDE_FAKE;
});

describe("claudeText stream settling", () => {
  it("closes once on end; later end/error throw nothing", async () => {
    const { ee } = mockStream();
    const r = writeDraft([]).getReader();
    ee.emit("text", "a");
    ee.emit("text", "b");
    ee.emit("end");
    expect(() => ee.emit("end")).not.toThrow();
    expect(() => ee.emit("error", new Error("late"))).not.toThrow();
    expect(await readAll(r)).toBe("ab");
  });

  it("error then end rejects the reader; trailing end throws nothing", async () => {
    const { ee } = mockStream();
    const r = writeDraft([]).getReader();
    const boom = new Error("boom");
    ee.emit("error", boom);
    expect(() => ee.emit("end")).not.toThrow();
    await expect(r.read()).rejects.toBe(boom);
  });

  it("cancel aborts; error + end afterwards throw nothing", async () => {
    const { ee, abort } = mockStream();
    const r = writeDraft([]).getReader();
    await r.cancel();
    expect(abort).toHaveBeenCalled();
    expect(() => ee.emit("text", "x")).not.toThrow();
    expect(() => ee.emit("error", new Error("aborted"))).not.toThrow();
    expect(() => ee.emit("end")).not.toThrow();
  });
});

describe("askNextQuestion over the SDK stream", () => {
  it("MORE| prefix then text; duplicate end throws nothing", async () => {
    const { ee } = mockStream();
    const p = askNextQuestion([]);
    ee.emit("text", "MORE|");
    ee.emit("text", "질문");
    ee.emit("end");
    const { ready, stream } = await p;
    expect(ready).toBe(false);
    expect(await readAll(stream.getReader())).toBe("질문");
    expect(() => ee.emit("end")).not.toThrow();
  });
});
