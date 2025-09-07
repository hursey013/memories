import { config } from "../config.js";
import { photoUID } from "../lib/photoUid.js";

export function buildPhotosIndex(photos, ttlSeconds) {
  const buckets = {};
  let max_time = 0;
  let igonored = 0;

  for (const p of photos) {
    if (
      config.ignoredPeople.length &&
      p?.additional?.person.some((obj) => config.ignoredPeople.includes(obj.name.toLowerCase()))
    ) {
      igonored++;
      continue;
    }

    const entry = {
      uid: photoUID(p),
      id: p.id,
      time: p.time,
      address: Object.entries(p?.additional?.address || {})
        .filter(([key]) => !key.endsWith("_id"))
        .filter(([_, value]) => Boolean(value))
        .map(([_, value]) => value),
      cache_key: p?.additional?.thumbnail?.cache_key,
      // sent_at intentionally omitted here; we merge it in later
    };
    max_time = Math.max(max_time, p.time);
    const d = new Date(p.time * 1000);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const k = `${mm}-${dd}`;
    (buckets[k] ||= []).push(entry);
  }

  return {
    built_at: new Date().toISOString(),
    ttl_seconds: ttlSeconds,
    max_time,
    count: photos.length - igonored,
    buckets,
  };
}
