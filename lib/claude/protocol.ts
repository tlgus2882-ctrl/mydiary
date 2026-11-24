export type Turn = { role: "assistant" | "user"; content: string };

const MAX_PREFIX_WAIT = 20;
const PREFIXES = ["READY|", "MORE|"];

export function parseReadyPrefix(raw: string): { ready: boolean; rest: string } | null {
  const buffer = raw.trimStart(); // models sometimes start with a newline; never leak "MORE|"
  for (const p of PREFIXES) {
    if (buffer.startsWith(p)) return { ready: p === "READY|", rest: buffer.slice(p.length) };
  }
  // still could become a known prefix: keep waiting (unless it has gone on too long)
  if (buffer.length <= MAX_PREFIX_WAIT && PREFIXES.some((p) => p.startsWith(buffer) && buffer.length < p.length)) {
    return null;
  }
  return { ready: false, rest: buffer };
}

export function splitDraft(text: string): { title: string; body: string } {
  const t = text.trim();
  const i = t.indexOf("\n");
  if (i === -1) return { title: "", body: t };
  return { title: t.slice(0, i).replace(/^[#\s]+/, "").trim(), body: t.slice(i + 1).trim() };
}
