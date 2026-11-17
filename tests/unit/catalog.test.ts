import { describe, expect, it } from "vitest";
import { DEFAULT_FONT_ID, FONTS, fontCssUrl } from "@/lib/fonts";
import { DEFAULT_THEME_ID, THEMES } from "@/lib/themes";

describe("themes", () => {
  it("has at least 8 themes with unique ids", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });
  it("gives every theme the same set of --diary-* vars", () => {
    const keys = (t: (typeof THEMES)[number]) => Object.keys(t.vars).sort().join();
    for (const t of THEMES) {
      expect(keys(t)).toBe(keys(THEMES[0]));
      expect(Object.keys(t.vars).every((k) => k.startsWith("--diary-"))).toBe(true);
    }
  });
  it("includes the default theme", () => {
    expect(DEFAULT_THEME_ID).toBe("cream");
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
  });
});

describe("fonts", () => {
  it("has at least 10 fonts with unique ids and names", () => {
    expect(FONTS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length);
    expect(new Set(FONTS.map((f) => f.name)).size).toBe(FONTS.length);
  });
  it("includes the default font", () => {
    expect(DEFAULT_FONT_ID).toBe("gowun-batang");
    expect(FONTS.some((f) => f.id === DEFAULT_FONT_ID)).toBe(true);
  });
  it("builds a CSS2 url, with a text= subset only for previews", () => {
    for (const f of FONTS) {
      const full = fontCssUrl(f);
      expect(full).toContain("https://fonts.googleapis.com/css2?family=");
      expect(full).not.toContain("text=");
      expect(fontCssUrl(f, "가")).toContain(`text=${encodeURIComponent("가")}`);
    }
  });
});
