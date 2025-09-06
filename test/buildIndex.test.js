import { describe, it, expect } from "vitest";
import { buildPhotosIndex } from "../src/cache/buildIndex.js";

describe("buildPhotosIndex", () => {
  it("buckets by month-day and copies essential fields", () => {
    const photos = [
      {
        id: 1,
        time: Date.parse("2019-07-14T10:00:00Z") / 1000,
        additional: { address: { city: "Cville" }, thumbnail: { cache_key: "1_foo" } },
      },
      {
        id: 2,
        time: Date.parse("2020-07-14T09:00:00Z") / 1000,
        additional: { address: { city: "Cville" }, thumbnail: { cache_key: "2_bar" } },
      },
      {
        id: 3,
        time: Date.parse("2019-12-25T12:00:00Z") / 1000,
        additional: { address: { city: "Richmond" }, thumbnail: { cache_key: "3_baz" } },
      },
    ];
    const idx = buildPhotosIndex(photos, 1000);
    expect(idx.buckets["07-14"].length).toBe(2);
    expect(idx.buckets["12-25"].length).toBe(1);
    expect(idx.count).toBe(3);
    expect(idx.ttl_seconds).toBe(1000);
  });
});
