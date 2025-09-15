import fs from "node:fs/promises";

import { config } from "./config.js";

/** Load or return empty sent map: { [photoUID]: sentAtISO } */
export async function loadSent() {
  try {
    const raw = await fs.readFile(config.synology.sentPath, "utf-8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return data;
  } catch {}
  return {};
}

export async function saveSent(map) {
  const dir = config.synology.sentPath.split("/").slice(0, -1).join("/");
  if (dir) await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(config.synology.sentPath, JSON.stringify(map, null, 2));
}

export function wasSent(map, uid) {
  return !!map[uid];
}

export function markSent(map, uid, whenISO = new Date().toISOString()) {
  map[uid] = whenISO;
  return map;
}
