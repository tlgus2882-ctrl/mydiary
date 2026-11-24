"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Turn } from "@/lib/claude/protocol";
import { MAX_ANSWER_LENGTH, MAX_FOLLOW_UPS, canFinishEarly, validateAnswer } from "@/lib/conversation/rules";
import { localDate } from "@/lib/date";
import css from "./chat.module.css";

type Pending = { id: string; text: string };
type Status = "idle" | "sending" | "failed" | "offer" | "user_limit" | "global_limit";

const NOTICE: Partial<Record<Status, string>> = {
  offer: "이야기를 충분히 들은 것 같아요. 이제 일기를 써 볼까요?",
  user_limit: "오늘 나눌 수 있는 대화를 모두 썼어요. 지금까지의 이야기로 일기를 써 볼까요?",
  global_limit: "지금은 대화를 이어 갈 수 없어요. 지금까지의 이야기로 일기를 써 볼까요?",
};

export function ChatView(props: {
  email: string;
  initialTurns: Turn[];
  unanswered: Pending | null;
  diaryDate: string | null;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState(props.initialTurns);
  const [pending, setPending] = useState<Pending | null>(props.unanswered);
  const [status, setStatus] = useState<Status>(props.unanswered ? "failed" : "idle");
  const [streaming, setStreaming] = useState("");
  const [input, setInput] = useState("");
  const [diaryDate, setDiaryDate] = useState(props.diaryDate);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []); // typing before hydration would be lost
  const busy = useRef(false); // state updates are async; a ref blocks a fast second click (RF2)

  const followUps = turns.filter((t) => t.role === "assistant").length - 1;
  const valid = validateAnswer(input);
  const quota = status === "user_limit" || status === "global_limit";
  const canSend = valid.ok && !pending && !quota;
  const canFinish = !!diaryDate && status !== "sending" && (canFinishEarly(followUps) || quota);

  async function send(turn: Pending) {
    if (busy.current) return;
    busy.current = true;
    setPending(turn);
    setStatus("sending");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: localDate(), answer: turn.text, clientTurnId: turn.id }),
      });
      if (res.status === 429) {
        // the answer is saved; only the next question was refused (R13)
        const { reason } = await res.json();
        setTurns((t) => [...t, { role: "user", content: turn.text }]);
        setPending(null);
        setStatus(reason === "global_limit" ? "global_limit" : "user_limit");
        return;
      }
      if (res.status === 409) {
        const { reason, date } = await res.json();
        if (reason === "already_written") return router.push(`/diary/${date}`);
      }
      if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
      const date = res.headers.get("X-Diary-Date")!;
      setDiaryDate(date);
      if (res.headers.get("X-Next") === "draft") return router.push(`/diary/${date}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += value;
        setStreaming(text);
      }
      setTurns((t) => [...t, { role: "user", content: turn.text }, { role: "assistant", content: text.trim() }]);
      setPending(null);
      setStatus(res.headers.get("X-Next") === "offer_finish" ? "offer" : "idle");
    } catch {
      setStatus("failed"); // keep the answer on screen; retry resends the same turn id (R14)
    } finally {
      setStreaming("");
      busy.current = false;
    }
  }

  function submit() {
    if (!canSend || !valid.ok) return;
    setInput("");
    send({ id: crypto.randomUUID(), text: valid.value });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return; // IME composing (RF1)
    e.preventDefault();
    submit();
  }

  return (
    <main className={css.main}>
      <header className={css.head}>
        <span>{props.email}</span>
        <span className={css.dots} aria-label={`후속 질문 ${followUps}/${MAX_FOLLOW_UPS}`}>
          {Array.from({ length: MAX_FOLLOW_UPS }, (_, i) => (
            <span key={i} data-dot={i < followUps ? "on" : "off"} aria-hidden>
              {i < followUps ? "●" : "○"}
            </span>
          ))}
        </span>
      </header>

      {turns.map((t, i) => (
        <p key={i} className={t.role === "user" ? css.a : css.q}>
          {t.content}
        </p>
      ))}
      {pending && <p className={css.a}>{pending.text}</p>}
      {streaming && <p className={css.q}>{streaming}</p>}

      {status === "failed" && pending && (
        <p role="alert">
          다음 질문을 받지 못했어요.{" "}
          <button className={css.retry} onClick={() => send(pending)}>다시 시도</button>
        </p>
      )}
      {NOTICE[status] && <p role="status" className={css.notice}>{NOTICE[status]}</p>}

      <textarea
        className={css.input}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={4}
        disabled={!hydrated}
        aria-label="답변"
        placeholder="자유롭게 적어 주세요 (Shift+Enter 줄바꿈)"
      />
      {!valid.ok && valid.reason === "too_long" && (
        <p role="alert">
          {MAX_ANSWER_LENGTH}자까지 보낼 수 있어요 (지금 {input.trim().length}자).
        </p>
      )}
      <div className={css.actions}>
        <button className={css.send} onClick={submit} disabled={!canSend}>
          보내기
        </button>
        <button onClick={() => router.push(`/diary/${diaryDate}`)} disabled={!canFinish}>
          이제 일기 쓰기
        </button>
      </div>
    </main>
  );
}
