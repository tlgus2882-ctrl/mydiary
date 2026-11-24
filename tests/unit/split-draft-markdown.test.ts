import { describe, expect, it } from "vitest";
import { splitDraft } from "@/lib/claude/protocol";

describe("splitDraft markdown stripping", () => {
  it("strips a stray leading ** from the title", () => {
    expect(splitDraft("**마감 직전에 찾아온 큰 주문\n본문").title).toBe("마감 직전에 찾아온 큰 주문");
  });
  it("strips heading, emphasis in title and body", () => {
    expect(splitDraft("# **제목**\n본문 **강조** 끝")).toEqual({ title: "제목", body: "본문 강조 끝" });
  });
  it("strips surrounding quotes, __ and line markers", () => {
    const r = splitDraft('"__제목__"\n# 소제목\n- 항목');
    expect(r.title).toBe("제목");
    expect(r.body).toBe("소제목\n항목");
  });
  it("leaves plain text unchanged", () => {
    expect(splitDraft("제목\n오늘은 맑았다.")).toEqual({ title: "제목", body: "오늘은 맑았다." });
  });
});
