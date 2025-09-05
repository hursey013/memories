import { describe, expect, it } from "vitest";
import { formatLocation } from "../src/utils/location.js";

describe("formatLocation", () => {
  it("filters empty parts", () => {
    const s = formatLocation({ country: "USA", state: "VA", city: "Charlottesville" });
    expect(s).toBe("USA, VA, Charlottesville");
  });

  it("returns empty string for empty input", () => {
    expect(formatLocation({})).toBe("");
  });
});
