import { describe, expect, it } from "vitest";
import { parseReadyPrefix } from "@/lib/claude/protocol";

describe("parseReadyPrefix with leading whitespace", () => {
  it("ignores newlines/spaces before the prefix", () => {
    expect(parseReadyPrefix("\nMORE|질문")).toEqual({ ready: false, rest: "질문" });
    expect(parseReadyPrefix("  \n READY|좋아요")).toEqual({ ready: true, rest: "좋아요" });
  });
  it("keeps waiting while only whitespace or a partial prefix has arrived", () => {
    expect(parseReadyPrefix("\n")).toBeNull();
    expect(parseReadyPrefix("\n MO")).toBeNull();
  });
  it("never leaks the prefix into the question", () => {
    expect(parseReadyPrefix("\n\nMORE|왜요?")?.rest).not.toContain("MORE|");
  });
});
