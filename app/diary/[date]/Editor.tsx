"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeFontPicker } from "@/components/ThemeFontPicker";
import { splitDraft } from "@/lib/claude/protocol";
import { FONTS, fontCssUrl } from "@/lib/fonts";
import css from "./diary.module.css";
import { THEMES } from "@/lib/themes";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Props = { id: string; date: string; initialTitle: string; initialBody: string; autoDraft: boolean; initialThemeId: string; initialFontId: string; hasLog: boolean };

const SIZE_KEY = "diary-text-size";
export const SIZES = [{ id: "small", name: "작게", scale: 0.9 }, { id: "normal", name: "보통", scale: 1 }, { id: "large", name: "크게", scale: 1.25 }];

export function Editor({ id, date, initialTitle, initialBody, autoDraft, initialThemeId, initialFontId, hasLog }: Props) {
  const [sizeId, setSizeId] = useState("normal");
  const [open, setOpen] = useState(true); // collapsed by default only on narrow screens (set after mount)
  const size = SIZES.find((z) => z.id === sizeId) ?? SIZES[1];
  const [themeId, setThemeId] = useState(initialThemeId);
  const [fontId, setFontId] = useState(initialFontId);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [drafting, setDrafting] = useState(autoDraft);
  const canDraft = !drafting && !title && !body; // empty drafted diary (failed earlier): offer a draft
  const [failed, setFailed] = useState(false); // only after a failed attempt in this session
  const [msg, setMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_KEY);
      if (SIZES.some((z) => z.id === saved)) setSizeId(saved!);
    } catch {}
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }, []);

  function pickSize(id: string) {
    setSizeId(id);
    try {
      localStorage.setItem(SIZE_KEY, id);
    } catch {}
  }

  function openLog(e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById("diary-log") as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth" });
  }

  async function draft(regenerate = false) {
    const prev = { title, body };
    if (regenerate && !window.confirm("지금 쓴 내용이 새 초안으로 바뀝니다. 계속할까요?")) return;
    setDrafting(true);
    setFailed(false);
    setMsg("");
    setTitle("");
    setBody("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regenerate ? { date, regenerate: true } : { date }),
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
      setTitle(regenerate ? prev.title : "");
      setBody(regenerate ? prev.body : "");
      if (regenerate) setMsg("초안을 다시 만들지 못했어요. 쓰던 내용은 그대로예요.");
      else setFailed(true);
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
      {/* after the picker's subset links, so for the selected font the full CSS wins (same family name) */}
      <link key={font.id} rel="stylesheet" href={fontCssUrl(font)} />
      <div data-testid="diary-page" className={css.page} style={{ ...theme.vars, fontFamily: font.family, "--font-scale": font.scale * size.scale } as React.CSSProperties}>
        <div className={css.head}>
        <h1 className={css.date}>{date}</h1>
        {hasLog && (
          <a href="#diary-log" className={css.logLink} onClick={openLog}>
            대화 기록 보기
          </a>
        )}
        {!drafting && !canDraft && (title || body) && (
          <button type="button" className={`${css.link} ${css.redo}`} onClick={() => void draft(true)}>
            초안 다시 만들기
          </button>
        )}
        </div>
        {drafting && <p role="status" className={css.status}>초안을 쓰는 중…</p>}
        {failed && (
          <p role="alert" className={css.status}>
            초안을 만들지 못했어요. 직접 쓰거나{" "}
            <button type="button" className={css.link} onClick={() => void draft()}>
              다시 시도
            </button>
            해 보세요.
          </p>
        )}
        {canDraft && !failed && (
          <button type="button" className={css.link} onClick={() => void draft()}>
            초안 만들기
          </button>
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
        <button type="button" className={css.save} disabled={drafting} onClick={save}>
          저장
        </button>
        {msg && <span role="status" className={css.msg}>{msg}</span>}
      </div>
      <button type="button" className={css.toggle} aria-expanded={open} aria-controls="decorate" onClick={() => setOpen(!open)}>
        꾸미기
      </button>
      <div id="decorate" hidden={!open}>
        <ThemeFontPicker themeId={theme.id} fontId={font.id} sizeId={size.id} sizes={SIZES} onTheme={setThemeId} onFont={setFontId} onSize={pickSize} />
      </div>
    </main>
  );
}
