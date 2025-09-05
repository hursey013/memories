/** Build a compact month-day index from raw Synology photo list. */
export function buildPhotosIndex(photos, ttlSeconds) {
  const buckets = {};
  let max_time = 0;

  for (const p of photos) {
    const entry = {
      id: p.id,
      time: p.time,
      address: p?.additional?.address,
      cache_key: p?.additional?.thumbnail?.cache_key,
    };
    max_time = Math.max(max_time, p.time);
    const d = new Date(p.time * 1000);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${mm}-${dd}`;
    (buckets[key] ||= []).push(entry);
  }

  return {
    built_at: new Date().toISOString(),
    ttl_seconds: ttlSeconds,
    max_time,
    count: photos.length,
    buckets,
  };
}
