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

// The API needs user-first alternation of non-empty turns. Empty turns (a stored question that was only
// "MORE|") are dropped and same-role neighbours joined. The fixed first question is an assistant turn,
// so a short user turn is prepended; `closing` (an instruction, so not wrapped as an <answer>) is
// appended when the conversation ends on a question.
function toMessages(history: Turn[], closing?: string) {
  const msgs: { role: Turn["role"]; content: string }[] = [];
  for (const t of history) {
    if (!t.content.trim()) continue;
    const content = t.role === "user" ? `<answer>${t.content}</answer>` : t.content;
    const last = msgs.at(-1);
    if (last?.role === t.role) last.content += `\n${content}`;
    else msgs.push({ role: t.role, content });
  }
  if (msgs[0]?.role === "assistant") msgs.unshift({ role: "user", content: "(일기 대화를 시작합니다)" });
  if (closing && msgs.at(-1)?.role === "assistant") msgs.push({ role: "user", content: closing });
  return msgs;
}

function claudeText(
  system: string,
  messages: ReturnType<typeof toMessages>,
  maxTokens: number,
): ReadableStream<string> {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) throw new Error("ANTHROPIC_MODEL is not set (or set CLAUDE_FAKE=1)");
  const stream = new Anthropic().messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });
  // The SDK calls Promise.reject on 'abort' when nothing listens for it (unhandled rejection on cancel).
  stream.on("abort", () => {});
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
  // thinking tokens count toward max_tokens (#46)
  const reader = claudeText(QUESTION_SYSTEM, toMessages(history), 4000).getReader();
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
  if (isFake()) return oneShot("가짜 제목\n가짜 본문");
  // The user may stop right after a question; current models reject an assistant-final conversation (prefill).
  return claudeText(DRAFT_SYSTEM, toMessages(history, "(대화를 마칩니다. 위 대화로 일기를 써 주세요.)"), 16000);
}
