import fs from "node:fs/promises";
import path from "node:path";

import { config } from "./config.js";

/**
 * Sent-cache helpers. Each calendar day lives in its own JSON file so we can
 * grow the history without rewriting a gigantic blob on every run.
 */
/**
 * Build the MM-DD cache key for a specific month/day.
 * @param {number} month 1-based month value.
 * @param {number} day Day of month.
 * @returns {string} Cache key formatted as MM-DD.
 */
export function makeDayKey(month, day) {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function entryPath(dayKey) {
  return path.join(config.synology.sentDir, `${dayKey}.json`);
}

async function loadDay(dayKey) {
  try {
    const raw = await fs.readFile(entryPath(dayKey), "utf-8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    /* intentionally ignore missing or malformed cache file */
  }
  return {};
}

/**
 * Persist the per-day cache map to disk.
 * @param {string} dayKey Day key (MM-DD).
 * @param {Record<string, any>} map Cached entries for that day.
 */
async function saveDay(dayKey, map) {
  const target = entryPath(dayKey);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, JSON.stringify(map, null, 2));
}

/**
 * Load the per-day cache for the provided key.
 * @param {string} dayKey Day key (MM-DD).
 * @returns {Promise<Record<string, any>>} Stored sent map for the day.
 */
export async function loadSent(dayKey) {
  if (!dayKey) return {};
  return loadDay(dayKey);
}

/**
 * Save the sent map for a specific day.
 * @param {string} dayKey Day key (MM-DD).
 * @param {Record<string, any>} map Cache contents to persist.
 * @returns {Promise<void>}
 */
export async function saveSent(dayKey, map) {
  if (!dayKey) return;
  await saveDay(dayKey, map);
}

/**
 * Check whether a photo has already been sent.
 * @param {Record<string, any>} map Sent cache map.
 * @param {string} uid Photo identifier.
 * @returns {boolean} True when the photo already exists in cache.
 */
export function wasSent(map, uid) {
  return Boolean(map?.[uid]);
}

/**
 * Record a photo as sent in the provided cache map.
 * @param {Record<string, any>} map Sent cache map to mutate.
 * @param {string} uid Photo identifier.
 * @param {{ whenISO?: string, photoDate?: Date, photoTimestamp?: number|null }} [opts]
 *   Additional metadata to store alongside the sent entry.
 * @returns {Record<string, any>} The mutated cache map.
 */
export function markSent(
  map,
  uid,
  { whenISO = new Date().toISOString(), photoDate, photoTimestamp = null } = {}
) {
  let photoDateISO = null;
  let derivedPhotoTimestamp = photoTimestamp;

  if (photoDate instanceof Date && !Number.isNaN(photoDate.valueOf())) {
    derivedPhotoTimestamp = derivedPhotoTimestamp ?? photoDate.getTime();
    photoDateISO = photoDate.toISOString();
  }

  map[uid] = {
    when: whenISO,
    photoTimestamp: derivedPhotoTimestamp,
    photoDateISO,
  };
  return map;
}

/**
 * Delete the persisted cache shard for the given day.
 * @param {string} dayKey Day key (MM-DD).
 * @returns {Promise<boolean>} True when a file existed and was removed.
 */
export async function clearSentForDay(dayKey) {
  if (!dayKey) return false;
  try {
    await fs.unlink(entryPath(dayKey));
    return true;
  } catch {
    /* cache shard did not exist */
  }
  return false;
}
