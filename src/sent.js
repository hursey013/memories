import fs from "node:fs/promises";

const SENT_PATH = process.env.SENT_PATH || "./cache/sent.json";

/** Load or return empty sent map: { [photoUID]: sentAtISO } */
export async function loadSent() {
  try {
    const raw = await fs.readFile(SENT_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return data;
  } catch {}
  return {};
}

export async function saveSent(map) {
  const dir = SENT_PATH.split("/").slice(0, -1).join("/");
  if (dir) await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SENT_PATH, JSON.stringify(map, null, 2));
}

export function wasSent(map, uid) {
  return !!map[uid];
}

export function markSent(map, uid, whenISO = new Date().toISOString()) {
  map[uid] = whenISO;
  return map;
}
