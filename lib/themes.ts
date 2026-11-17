export type Theme = { id: string; name: string; vars: Record<`--diary-${string}`, string> };

export const DEFAULT_THEME_ID = "cream";

// Every theme sets the same keys. --diary-line is a background-image layer drawn over --diary-bg.
const theme = (
  id: string,
  name: string,
  bg: string,
  ink: string,
  muted: string,
  accent: string,
  line = "none",
  lineSize = "auto",
  lineHeight = "1.9",
): Theme => ({
  id,
  name,
  vars: {
    "--diary-bg": bg,
    "--diary-ink": ink,
    "--diary-muted": muted,
    "--diary-accent": accent,
    "--diary-line": line,
    "--diary-line-size": lineSize,
    "--diary-line-height": lineHeight,
  },
});

const ruled = (c: string) => `repeating-linear-gradient(transparent 0 27px, ${c} 27px 28px)`;
const grid = (c: string) => `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`;

export const THEMES: Theme[] = [
  theme("cream", "크림 종이", "#f8f1e3", "#4a3b2a", "#8a7a63", "#b5651d", ruled("#e3d5bb"), "auto", "28px"),
  theme("pen", "모눈 손글씨", "#fffdf7", "#2b4a6f", "#6f86a3", "#d9534f", grid("#e9eef5"), "22px 22px", "22px"),
  theme("night", "밤하늘", "linear-gradient(160deg, #1b2340, #2c2a4a)", "#e6e1f5", "#a39fc0", "#f3d58b"),
  theme("minimal", "미니멀", "#ffffff", "#222222", "#888888", "#222222"),
  theme("cherry", "벚꽃", "#fff0f3", "#5a3a45", "#a07a86", "#e0657f", ruled("#f6d3db"), "auto", "28px"),
  theme("letter", "편지지", "#fdfaf0", "#3b4a3b", "#7d8a7d", "#4f7f5a", grid("#ece6d0"), "26px 26px", "26px"),
  theme("forest", "숲", "linear-gradient(160deg, #16301f, #24412c)", "#e3f0e0", "#9bb8a0", "#c9e265"),
  theme("kraft", "크래프트", "#d9c3a0", "#3d2b1a", "#6e5a42", "#8c3b1f", ruled("#c8b08a"), "auto", "28px"),
];
