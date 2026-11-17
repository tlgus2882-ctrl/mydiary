import { FONTS, fontCssUrl } from "@/lib/fonts";
import { THEMES } from "@/lib/themes";

type Props = { themeId: string; fontId: string; onTheme: (id: string) => void; onFont: (id: string) => void };

export function ThemeFontPicker({ themeId, fontId, onTheme, onFont }: Props) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <fieldset className="flex flex-wrap gap-2" role="radiogroup" aria-label="테마">
        {THEMES.map((t) => (
          <label key={t.id} className="flex items-center gap-1">
            <input type="radio" name="theme" checked={t.id === themeId} onChange={() => onTheme(t.id)} />
            {t.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2" role="radiogroup" aria-label="글꼴">
        {FONTS.map((f) => (
          <label key={f.id} className="flex items-center gap-1" style={{ fontFamily: f.family }}>
            {/* subset CSS: only this font's own name is downloaded */}
            <link rel="stylesheet" href={fontCssUrl(f, f.name)} />
            <input type="radio" name="font" checked={f.id === fontId} onChange={() => onFont(f.id)} />
            {f.name}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
