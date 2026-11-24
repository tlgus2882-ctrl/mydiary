import { describe, expect, it } from "vitest";
import { daysSinceLastDiary } from "@/lib/welcome";

describe("daysSinceLastDiary", () => {
  it("null when there is no diary", () => expect(daysSinceLastDiary(null, "2026-11-24")).toBeNull());
  it("counts calendar days", () => {
    expect(daysSinceLastDiary("2026-11-24", "2026-11-24")).toBe(0);
    expect(daysSinceLastDiary("2026-11-23", "2026-11-24")).toBe(1);
    expect(daysSinceLastDiary("2026-11-21", "2026-11-24")).toBe(3);
  });
  it("works across month and year boundaries", () => {
    expect(daysSinceLastDiary("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysSinceLastDiary("2026-02-27", "2026-03-01")).toBe(2);
  });
});
