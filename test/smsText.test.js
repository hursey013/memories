import { describe, it, expect } from "vitest";
import { buildSmsText } from "../src/templates/smsText.js";

describe("buildSmsText", () => {
  it("includes date and location when present", () => {
    const d = new Date("2019-07-14T10:00:00Z");
    const txt = buildSmsText({
      photoDate: d,
      locationParts: { country: "USA", state: "VA", city: "Charlottesville" },
    });
    expect(txt).toMatch(/July \d{1,2}, 2019/);
    expect(txt).toContain("Charlottesville");
  });

  it("falls back to date when location missing", () => {
    const d = new Date("2019-07-14T10:00:00Z");
    const txt = buildSmsText({ photoDate: d, locationParts: {} });
    expect(txt).toMatch(/Taken on July \d{1,2}, 2019/);
  });
});
