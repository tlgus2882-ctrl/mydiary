import { FONTS, fontCssUrl } from "@/lib/fonts";
import { THEMES } from "@/lib/themes";
import css from "./picker.module.css";

type Props = { themeId: string; fontId: string; onTheme: (id: string) => void; onFont: (id: string) => void };

export function ThemeFontPicker({ themeId, fontId, onTheme, onFont }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <fieldset className={css.group} role="radiogroup" aria-label="테마">
        <legend className={css.legend}>테마</legend>
        {THEMES.map((t) => (
          <label key={t.id} className={css.opt}>
            <input type="radio" name="theme" checked={t.id === themeId} onChange={() => onTheme(t.id)} />
            <span className={css.card} style={t.vars as React.CSSProperties}>
              <b>가나다</b>
              {t.name}
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className={css.group} role="radiogroup" aria-label="글꼴">
        <legend className={css.legend}>글꼴</legend>
        {FONTS.map((f) => (
          <label key={f.id} className={css.opt}>
            {/* subset CSS: only this font's own name is downloaded */}
            <link rel="stylesheet" href={fontCssUrl(f, f.name)} />
            <input type="radio" name="font" checked={f.id === fontId} onChange={() => onFont(f.id)} />
            <span className={css.sample} style={{ fontFamily: f.family }}>
              {f.name}
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
