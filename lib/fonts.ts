export type Font = { id: string; name: string; family: string; googleFamily: string; scale: number };

export const DEFAULT_FONT_ID = "gowun-batang";

const font = (id: string, name: string, googleFamily: string, generic: "serif" | "sans-serif" | "cursive", scale = 1): Font => ({
  scale,
  id,
  name,
  googleFamily,
  family: `'${googleFamily}', ${generic}`,
});

export const FONTS: Font[] = [
  font("gowun-batang", "고운바탕", "Gowun Batang", "serif"),
  font("nanum-pen-script", "나눔손글씨 펜", "Nanum Pen Script", "cursive", 1.4),
  font("noto-serif-kr", "본명조", "Noto Serif KR", "serif"),
  font("gowun-dodum", "고운돋움", "Gowun Dodum", "sans-serif"),
  font("gamja-flower", "감자꽃", "Gamja Flower", "cursive", 1.3),
  font("hi-melody", "하이멜로디", "Hi Melody", "cursive", 1.3),
  font("nanum-myeongjo", "나눔명조", "Nanum Myeongjo", "serif"),
  font("jua", "주아", "Jua", "sans-serif"),
  font("poor-story", "푸어스토리", "Poor Story", "cursive", 1.3),
  font("song-myung", "송명", "Song Myung", "serif"),
];

// Full font CSS, or (with previewText) a tiny subset with just those glyphs, so the picker stays light (R10).
export const fontCssUrl = (font: Font, previewText?: string) =>
  `https://fonts.googleapis.com/css2?family=${font.googleFamily.replaceAll(" ", "+")}&display=swap` +
  (previewText ? `&text=${encodeURIComponent(previewText)}` : "");
