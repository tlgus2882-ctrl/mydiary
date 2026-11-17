"use client";

import { useEffect, useRef, useState } from "react";
import { splitDraft } from "@/lib/claude/protocol";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = { id: string; date: string; initialTitle: string; initialBody: string; autoDraft: boolean };

export function Editor({ id, date, initialTitle, initialBody, autoDraft }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [drafting, setDrafting] = useState(autoDraft);
  const [failed, setFailed] = useState(false); // only after a failed attempt in this session
  const [msg, setMsg] = useState("");
  const started = useRef(false);

  async function draft() {
    setDrafting(true);
    setFailed(false);
    setMsg("");
    setTitle("");
    setBody("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok || !res.headers.get("Content-Type")?.startsWith("text/plain") || !res.body) throw new Error("draft failed");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let text = "";
      for (let r = await reader.read(); !r.done; r = await reader.read()) {
        text += r.value;
        const d = splitDraft(text);
        setTitle(d.title);
        setBody(d.body);
      }
      if (!text.trim()) throw new Error("empty draft");
    } catch {
      setTitle("");
      setBody("");
      setFailed(true);
    } finally {
      setDrafting(false);
    }
  }

  useEffect(() => {
    if (autoDraft && !started.current) {
      started.current = true;
      void draft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg("");
    const { error } = await createBrowserSupabase().from("diaries").update({ title, body, status: "saved" }).eq("id", id);
    setMsg(error ? "저장하지 못했어요. 다시 눌러 주세요." : "저장했어요");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <h1 className="text-sm text-gray-500">{date}</h1>
      {drafting && <p role="status">초안을 쓰는 중…</p>}
      {failed && (
        <p role="alert">
          초안을 만들지 못했어요. 직접 쓰거나{" "}
          <button type="button" className="underline" onClick={draft}>
            다시 시도
          </button>
          해 보세요.
        </p>
      )}
      <label className="flex flex-col gap-1">
        제목
        <input className="rounded border p-2" value={title} disabled={drafting} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        본문
        <textarea className="min-h-64 rounded border p-2" value={body} disabled={drafting} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="flex items-center gap-3">
        <button type="button" className="rounded border px-4 py-2" disabled={drafting} onClick={save}>
          저장
        </button>
        {msg && <span role="status">{msg}</span>}
      </div>
    </main>
  );
}
