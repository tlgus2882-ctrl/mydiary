import { describe, expect, it } from "vitest";
import { isAcceptableDate } from "@/lib/date";

describe("isAcceptableDate", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  it("accepts dates within the global timezone window", () => {
    expect(isAcceptableDate("2026-11-17", now)).toBe(true);
    expect(isAcceptableDate("2026-11-18", now)).toBe(true); // UTC+14
    expect(isAcceptableDate("2026-11-16", now)).toBe(true); // UTC-12
  });
  it("rejects dates outside the window", () => {
    expect(isAcceptableDate("2026-11-19", now)).toBe(false);
    expect(isAcceptableDate("2026-11-15", now)).toBe(false);
  });
  it("rejects invalid dates", () => {
    expect(isAcceptableDate("2026-13-01", now)).toBe(false);
    expect(isAcceptableDate("2026-02-30", now)).toBe(false);
    expect(isAcceptableDate("not-a-date", now)).toBe(false);
  });
  it("moves with the day boundary of now+14h", () => {
    const before = new Date("2026-11-17T09:59:00Z"); // now+14h = 11-17 23:59
    const after = new Date("2026-11-17T10:01:00Z"); // now+14h = 11-18 00:01
    expect(isAcceptableDate("2026-11-18", before)).toBe(false);
    expect(isAcceptableDate("2026-11-18", after)).toBe(true);
  });
});
