import { describe, expect, it } from "vitest";
import {
  FIRST_QUESTION,
  MAX_ANSWER_LENGTH,
  MAX_FOLLOW_UPS,
  MIN_FOLLOW_UPS,
  canFinishEarly,
  nextAction,
  validateAnswer,
} from "@/lib/conversation/rules";

describe("constants", () => {
  it("match the spec", () => {
    expect(FIRST_QUESTION).toBe("오늘 하루는 어떠셨나요?");
    expect(MIN_FOLLOW_UPS).toBe(3);
    expect(MAX_FOLLOW_UPS).toBe(6);
    expect(MAX_ANSWER_LENGTH).toBe(2000);
  });
});

describe("nextAction", () => {
  it("keeps asking before 3 follow-ups even when model is ready", () => {
    expect(nextAction(0, true)).toBe("ask");
    expect(nextAction(2, true)).toBe("ask");
  });
  it("keeps asking at 3 when model is not ready", () => {
    expect(nextAction(3, false)).toBe("ask");
    expect(nextAction(5, false)).toBe("ask");
  });
  it("offers finish from 3 when ready", () => {
    expect(nextAction(3, true)).toBe("offer_finish");
    expect(nextAction(5, true)).toBe("offer_finish");
  });
  it("always drafts at 6", () => {
    expect(nextAction(6, false)).toBe("draft");
    expect(nextAction(6, true)).toBe("draft");
  });
});

describe("canFinishEarly", () => {
  it("needs at least 3 follow-ups", () => {
    expect(canFinishEarly(2)).toBe(false);
    expect(canFinishEarly(3)).toBe(true);
  });
});

describe("validateAnswer", () => {
  it("rejects blank", () => {
    expect(validateAnswer("   ")).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects over 2000 chars, accepts exactly 2000", () => {
    expect(validateAnswer("a".repeat(2001))).toEqual({ ok: false, reason: "too_long" });
    expect(validateAnswer("a".repeat(2000)).ok).toBe(true);
  });
  it("trims", () => {
    expect(validateAnswer("  좋았어 ")).toEqual({ ok: true, value: "좋았어" });
  });
});
