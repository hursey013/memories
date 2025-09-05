import { getPB, collectionName } from "./pocketbase.js";

/** Build a stable UID for a Synology photo (cache_key base or id). */
export function photoUID(photo) {
  const cacheKey = photo?.cache_key || photo?.additional?.thumbnail?.cache_key;
  const fromCache = cacheKey?.split("_")?.[0];
  return String(fromCache || photo.id);
}

/** "MM-DD" from a unix seconds timestamp. */
export function bucketKeyFromUnix(unixSec) {
  const d = new Date(unixSec * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** Load sent IDs for a bucket as a Set<string>. One lightweight request. */
export async function loadSentSet(bucket) {
  const pb = await getPB();
  const col = collectionName();

  // Pull up to a reasonable cap; bump if you have tons per day
  const items = await pb.collection(col).getFullList({
    filter: `bucket="${bucket}"`,
    sort: "-created",
    fields: "photo_uid", // only fetch what we need
    batch: 200, // fetch in chunks if many
  });

  return new Set(items.map((r) => r.photo_uid));
}

/** Mark a photo as sent (idempotent thanks to unique photo_uid). */
export async function markSent({ photoUID, bucket, takenAt }) {
  const pb = await getPB();
  const col = collectionName();
  try {
    await pb.collection(col).create({
      photo_uid: photoUID,
      bucket,
      taken_at: takenAt ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    // If it’s a duplicate key error (photo_uid unique), we can ignore it
    if (
      String(err?.message || "")
        .toLowerCase()
        .includes("unique")
    )
      return;
    throw err;
  }
}

/** Optional: clear a bucket to start a fresh cycle for that day. */
export async function clearBucket(bucket) {
  const pb = await getPB();
  const col = collectionName();
  const pageSize = 200;
  let page = 1;
  // Delete in pages; PB doesn’t support multi-delete in a single call
  while (true) {
    const pageData = await pb.collection(col).getList(page, pageSize, {
      filter: `bucket="${bucket}"`,
      fields: "id",
    });
    if (pageData.items.length === 0) break;
    for (const rec of pageData.items) {
      // eslint-disable-next-line no-await-in-loop
      await pb.collection(col).delete(rec.id);
    }
    page += 1;
  }
}
