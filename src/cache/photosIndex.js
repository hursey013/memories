import fs from "node:fs/promises";
import path from "node:path";

const CACHE_PATH = process.env.PHOTOS_INDEX_PATH || "./cache/photos-index.json";
const DEFAULT_TTL = Number(process.env.PHOTOS_INDEX_TTL_SECONDS || 7 * 24 * 60 * 60); // 7 days

export async function loadPhotosIndex() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw);
    const ageSec = (Date.now() - new Date(data.built_at).getTime()) / 1000;
    const ttl = data.ttl_seconds ?? DEFAULT_TTL;
    if (ageSec < ttl) return data;
  } catch (_) {}
  return null;
}

export async function savePhotosIndex(index) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(index), "utf-8");
}
