"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeFontPicker } from "@/components/ThemeFontPicker";
import { splitDraft } from "@/lib/claude/protocol";
import { FONTS, fontCssUrl } from "@/lib/fonts";
import css from "./diary.module.css";
import { THEMES } from "@/lib/themes";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = { id: string; date: string; initialTitle: string; initialBody: string; autoDraft: boolean; initialThemeId: string; initialFontId: string };

export function Editor({ id, date, initialTitle, initialBody, autoDraft, initialThemeId, initialFontId }: Props) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const [fontId, setFontId] = useState(initialFontId);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
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
    const db = createBrowserSupabase();
    const saved = await db.from("diaries").update({ title, body, status: "saved", theme_id: theme.id, font_id: font.id }).eq("id", id);
    // user_id comes from the column default (auth.uid()), never from the client
    const prefs = await db.from("profiles").upsert({ last_theme_id: theme.id, last_font_id: font.id }, { onConflict: "user_id" });
    setMsg(saved.error || prefs.error ? "저장하지 못했어요. 다시 눌러 주세요." : "저장했어요");
  }

  return (
    <main className={css.shell}>
      <ThemeFontPicker themeId={theme.id} fontId={font.id} onTheme={setThemeId} onFont={setFontId} />
      {/* after the picker's subset links, so for the selected font the full CSS wins (same family name) */}
      <link key={font.id} rel="stylesheet" href={fontCssUrl(font)} />
      <div data-testid="diary-page" className={css.page} style={{ ...theme.vars, fontFamily: font.family } as React.CSSProperties}>
        <h1 className={css.date}>{date}</h1>
        {drafting && <p role="status" className={css.status}>초안을 쓰는 중…</p>}
        {failed && (
          <p role="alert" className={css.status}>
            초안을 만들지 못했어요. 직접 쓰거나{" "}
            <button type="button" style={{ font: "inherit", textDecoration: "underline" }} onClick={draft}>
              다시 시도
            </button>
            해 보세요.
          </p>
        )}
        <label className={css.field}>
          <span className={css.label}>제목</span>
          <input className={css.title} value={title} disabled={drafting} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={css.field}>
          <span className={css.label}>본문</span>
          <textarea className={css.body} value={body} disabled={drafting} onChange={(e) => setBody(e.target.value)} />
        </label>
      </div>
      <div className={css.bar}>
        <button type="button" disabled={drafting} onClick={save}>
          저장
        </button>
        {msg && <span role="status">{msg}</span>}
      </div>
    </main>
  );
}
