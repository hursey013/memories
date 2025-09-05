import { describe, expect, it, vi } from "vitest";
import { calculateYearsAgo, isSameMonthDayPastYear } from "../src/utils/date.js";

describe("calculateYearsAgo", () => {
  it("handles before/after anniversary", () => {
    const base = new Date("2020-09-10T00:00:00Z");
    const now = new Date("2025-09-04T00:00:00Z");
    vi.setSystemTime(now);
    expect(calculateYearsAgo(base)).toBe(4);
  });
});

describe("isSameMonthDayPastYear", () => {
  it("matches same month/day but earlier year", () => {
    const d = new Date("2018-09-04T12:00:00Z");
    expect(isSameMonthDayPastYear(d, 4, 9, 2025)).toBe(true);
  });

  it("rejects same year", () => {
    const d = new Date("2025-09-04T12:00:00Z");
    expect(isSameMonthDayPastYear(d, 4, 9, 2025)).toBe(false);
  });
});
