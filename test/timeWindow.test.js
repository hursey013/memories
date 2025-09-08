import { describe, it, expect } from "vitest";

function dayWindowEpochSeconds(year, month, day) {
  const start = Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000);
  const end = Math.floor(new Date(year, month - 1, day, 23, 59, 59).getTime() / 1000);
  return { start, end };
}

describe("dayWindowEpochSeconds", () => {
  it("spans ~24h allowing DST", () => {
    const { start, end } = dayWindowEpochSeconds(2022, 11, 6); // US DST shift
    expect(end - start).toBeGreaterThanOrEqual(23 * 3600); // 23h day possible
    expect(end - start).toBeLessThanOrEqual(24 * 3600);
  });
});
