import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_SYSTEM, QUESTION_SYSTEM } from "./prompts";
import { parseReadyPrefix, type Turn } from "./protocol";

const isFake = () => process.env.CLAUDE_FAKE === "1";

function oneShot(text: string): ReadableStream<string> {
  return new ReadableStream({
    start(c) {
      c.enqueue(text);
      c.close();
    },
  });
}

// The API needs user-first alternation; the fixed first question is an assistant turn,
// so a short user turn is prepended (smaller than rewriting the system prompt).
function toMessages(history: Turn[]) {
  const msgs = history.map((t) => ({
    role: t.role,
    content: t.role === "user" ? `<answer>${t.content}</answer>` : t.content,
  }));
  return msgs[0]?.role === "assistant"
    ? [{ role: "user" as const, content: "(일기 대화를 시작합니다)" }, ...msgs]
    : msgs;
}

function claudeText(system: string, history: Turn[], maxTokens: number): ReadableStream<string> {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error("ANTHROPIC_MODEL is not set (or set CLAUDE_FAKE=1)");
  const stream = new Anthropic().messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages: toMessages(history),
  });
  // The SDK can emit end after error/abort (and after our cancel); the controller throws if touched twice.
  let settled = false;
  return new ReadableStream({
    start(c) {
      stream.on("text", (t) => {
        if (!settled) c.enqueue(t);
      });
      stream.on("end", () => {
        if (settled) return;
        settled = true;
        c.close();
      });
      stream.on("error", (e) => {
        if (settled) return;
        settled = true;
        c.error(e);
      });
    },
    cancel() {
      settled = true;
      stream.abort();
    },
  });
}

export async function askNextQuestion(
  history: Turn[],
): Promise<{ ready: boolean; stream: ReadableStream<string> }> {
  if (isFake()) {
    // follow-up number = assistant turns - 1 (first fixed question) + 1 (this one)
    const n = history.filter((t) => t.role === "assistant").length;
    return { ready: n >= 3, stream: oneShot(`그때 기분이 어떠셨어요? (가짜 질문 ${n})`) };
  }
  const reader = claudeText(QUESTION_SYSTEM, history, 400).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += value;
    const parsed = parseReadyPrefix(buf);
    if (parsed || done) {
      const { ready, rest } = parsed ?? { ready: false, rest: buf };
      const stream = new ReadableStream<string>({
        start(c) {
          if (rest) c.enqueue(rest);
          if (done) c.close();
        },
        async pull(c) {
          if (done) return;
          const r = await reader.read();
          if (r.done) c.close();
          else c.enqueue(r.value);
        },
        cancel: () => reader.cancel(),
      });
      return { ready, stream };
    }
  }
}

export function writeDraft(history: Turn[]): ReadableStream<string> {
  return isFake() ? oneShot("가짜 제목\n가짜 본문") : claudeText(DRAFT_SYSTEM, history, 1500);
}
