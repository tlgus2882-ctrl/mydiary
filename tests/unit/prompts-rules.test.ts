import { describe, expect, it } from "vitest";
import { DRAFT_SYSTEM, QUESTION_SYSTEM } from "@/lib/claude/prompts";

describe("prompt rules guard", () => {
  it("draft prompt keeps voice, no-invention and no-markdown rules", () => {
    expect(DRAFT_SYSTEM).toContain("말투");
    expect(DRAFT_SYSTEM).toContain("존댓말");
    expect(DRAFT_SYSTEM).toContain("마크다운");
    expect(DRAFT_SYSTEM).toContain("하지 않은");
  });
  it("question prompt forbids asserting unstated feelings", () => {
    expect(QUESTION_SYSTEM).toContain("말하지 않은 감정");
    expect(QUESTION_SYSTEM).toContain("셨겠네요");
  });
});
