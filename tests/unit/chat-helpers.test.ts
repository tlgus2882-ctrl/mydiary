import { describe, expect, it } from "vitest";
import { localDate, previousDate } from "@/lib/date";
import { quotaLimits } from "@/lib/quota";

describe("quotaLimits", () => {
  it("defaults to 20 / 500 when unset or empty", () => {
    expect(quotaLimits({})).toEqual({ p_per_user: 20, p_global: 500 });
    expect(quotaLimits({ QUOTA_PER_USER: "", QUOTA_GLOBAL: "" })).toEqual({ p_per_user: 20, p_global: 500 });
  });
  it("parses integers", () => {
    expect(quotaLimits({ QUOTA_PER_USER: "3", QUOTA_GLOBAL: "0" })).toEqual({ p_per_user: 3, p_global: 0 });
  });
  it("throws on non-integers", () => {
    expect(() => quotaLimits({ QUOTA_PER_USER: "abc" })).toThrow();
    expect(() => quotaLimits({ QUOTA_PER_USER: "2.5" })).toThrow();
    expect(() => quotaLimits({ QUOTA_GLOBAL: "1e3" })).toThrow();
  });
});

describe("previousDate", () => {
  it("returns the day before, across month/year boundaries", () => {
    expect(previousDate("2026-11-17")).toBe("2026-11-16");
    expect(previousDate("2027-01-01")).toBe("2026-12-31");
    expect(previousDate("2028-03-01")).toBe("2028-02-29");
  });
  it("returns null for malformed or impossible dates", () => {
    expect(previousDate("2026-02-30")).toBeNull();
    expect(previousDate("2026-1-1")).toBeNull();
    expect(previousDate("")).toBeNull();
  });
});

describe("localDate", () => {
  it("formats the local calendar date as YYYY-MM-DD", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDate(new Date(2026, 10, 18, 0, 5))).toBe("2026-11-18");
  });
});
