import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_TTL = 7 * 24 * 60 * 60;
const CACHE_PATH = process.env.PHOTOS_INDEX_PATH || "./cache/photos-index.json";

/** Load the index if present and not expired; otherwise return null. */
export async function loadPhotosIndex() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw);
    const ageSec = (Date.now() - new Date(data.built_at).getTime()) / 1000;
    const ttl = data.ttl_seconds ?? DEFAULT_TTL;
    if (ageSec < ttl) return data;
  } catch {}
  return null;
}

export async function savePhotosIndex(index) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const tmp = CACHE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(index), "utf-8");
  await fs.rename(tmp, CACHE_PATH);
}

/** Merge old->new by uid so we preserve sent_at across rebuilds. */
export function mergeSent(oldIndex, newIndex) {
  if (!oldIndex) return newIndex;
  const sentLookup = new Map();
  for (const [bucket, list] of Object.entries(oldIndex.buckets || {})) {
    for (const e of list) {
      if (e?.uid && e?.sent_at) sentLookup.set(e.uid, e.sent_at);
    }
  }
  for (const [bucket, list] of Object.entries(newIndex.buckets || {})) {
    for (const e of list) {
      const s = sentLookup.get(e.uid);
      if (s) e.sent_at = s; // carry forward
    }
  }
  return newIndex;
}

/** Get entries for a given bucket (returns empty array if missing). */
export function entriesForBucket(index, bucket) {
  return Array.isArray(index?.buckets?.[bucket]) ? index.buckets[bucket] : [];
}

/** Return entries in a bucket with no sent_at, optionally filtered by predicate. */
export function unsentForBucket(index, bucket, predicate) {
  const all = entriesForBucket(index, bucket);
  return all.filter(e => !e.sent_at && (!predicate || predicate(e)));
}

/** Mark a uid as sent (in-memory). Returns true if updated. */
export function markSentInIndex(index, uid, when = new Date().toISOString()) {
  for (const list of Object.values(index.buckets || {})) {
    for (const e of list) {
      if (e.uid === uid) {
        e.sent_at = when;
        return true;
      }
    }
  }
  return false;
}

/** Clear sent_at for all entries in a bucket (in-memory). */
export function clearBucket(index, bucket) {
  for (const e of entriesForBucket(index, bucket)) {
    delete e.sent_at;
  }
}

/** True if there are no unsent items left in the bucket (optionally with predicate). */
export function isBucketComplete(index, bucket, predicate) {
  return unsentForBucket(index, bucket, predicate).length === 0;
}
