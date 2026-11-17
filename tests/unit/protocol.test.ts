import { describe, expect, it } from "vitest";
import { parseReadyPrefix, splitDraft } from "@/lib/claude/protocol";

describe("parseReadyPrefix", () => {
  it("returns null while the delimiter has not arrived", () => {
    expect(parseReadyPrefix("MOR")).toBeNull();
    expect(parseReadyPrefix("")).toBeNull();
    expect(parseReadyPrefix("READY")).toBeNull();
  });
  it("parses MORE| and READY|", () => {
    expect(parseReadyPrefix("MORE|왜 그렇게")).toEqual({ ready: false, rest: "왜 그렇게" });
    expect(parseReadyPrefix("READY|좋아요")).toEqual({ ready: true, rest: "좋아요" });
  });
  it("treats an unknown prefix as MORE", () => {
    expect(parseReadyPrefix("그냥 질문")).toEqual({ ready: false, rest: "그냥 질문" });
  });
  it("treats 20+ chars without a delimiter as MORE", () => {
    const long = "M".repeat(21);
    expect(parseReadyPrefix(long)).toEqual({ ready: false, rest: long });
  });
});

describe("splitDraft", () => {
  it("strips # from the title and trims the body", () => {
    expect(splitDraft("# 지친 날\n\n회의가 길었다.\n")).toEqual({
      title: "지친 날",
      body: "회의가 길었다.",
    });
  });
  it("single line becomes the body", () => {
    expect(splitDraft("한 줄뿐")).toEqual({ title: "", body: "한 줄뿐" });
  });
});
