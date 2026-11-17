"use client";

import { useState } from "react";
import css from "./settings.module.css";

export function SettingsForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  async function leave() {
    setError(false);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: text }),
      });
      if (res.ok) window.location.assign("/login");
      else setError(true);
    } catch {
      setError(true);
    }
  }

  return (
    <section className={css.form}>
      <p>탈퇴하면 모든 일기가 영구적으로 삭제되며 되돌릴 수 없어요. 계속하려면 &quot;탈퇴&quot;를 입력하세요.</p>
      <div className={css.row}>
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label="탈퇴 확인" />
        <button type="button" className={css.danger} disabled={text !== "탈퇴"} onClick={leave}>
          탈퇴
        </button>
      </div>
      {error && <p role="alert">탈퇴하지 못했어요. 다시 시도해 주세요.</p>}
    </section>
  );
}
