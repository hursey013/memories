import fs from "node:fs/promises";
import path from "node:path";

import { config } from "./config.js";

/**
 * Sent-cache helpers. Each calendar day lives in its own JSON file so we can
 * grow the history without rewriting a gigantic blob on every run.
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

async function saveDay(dayKey, map) {
  const target = entryPath(dayKey);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, JSON.stringify(map, null, 2));
}

export async function loadSent(dayKey) {
  if (!dayKey) return {};
  return loadDay(dayKey);
}

export async function saveSent(dayKey, map) {
  if (!dayKey) return;
  await saveDay(dayKey, map);
}

export function wasSent(map, uid) {
  return Boolean(map?.[uid]);
}

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
