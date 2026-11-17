export const FIRST_QUESTION = "오늘 하루는 어떠셨나요?";
export const MIN_FOLLOW_UPS = 3;
export const MAX_FOLLOW_UPS = 6;
export const MAX_ANSWER_LENGTH = 2000;

export function nextAction(
  followUpsAsked: number,
  modelReady: boolean,
): "ask" | "offer_finish" | "draft" {
  if (followUpsAsked >= MAX_FOLLOW_UPS) return "draft";
  if (followUpsAsked >= MIN_FOLLOW_UPS && modelReady) return "offer_finish";
  return "ask";
}

export function canFinishEarly(followUpsAsked: number): boolean {
  return followUpsAsked >= MIN_FOLLOW_UPS;
}

export function validateAnswer(
  text: string,
): { ok: true; value: string } | { ok: false; reason: "empty" | "too_long" } {
  const value = text.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > MAX_ANSWER_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, value };
}
