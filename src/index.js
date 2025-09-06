// src/index.js
import fs from "node:fs/promises";
import cron from "node-cron";

import { config, randomCfg } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildSmsText } from "./templates/smsText.js";
import { sendApprise } from "./notify/appriseApi.js";
import {
  loadPhotosIndex,
  savePhotosIndex,
  mergeSent,
  entriesForBucket,
  markSentInIndex,
  clearBucket,
} from "./cache/photosIndex.js";
import { buildPhotosIndex } from "./cache/buildIndex.js";
import { startRandomScheduler } from "./schedule/randomSender.js";
import { photoUID } from "./lib/photoUid.js"; // if you decide to use plain `photo.id`, you can remove this

const CACHE_PATH = process.env.PHOTOS_INDEX_PATH || "./cache/photos-index.json";

async function getOrBuildIndex(client, sid) {
  // Optional testing aid: force refresh
  if (process.env.FORCE_REFRESH === "1") {
    await savePhotosIndex({
      built_at: "1970-01-01T00:00:00Z",
      ttl_seconds: 0,
      buckets: {},
    });
  }

  // If cache is valid, use it
  const cached = await loadPhotosIndex();
  if (cached) return cached;

  // Build fresh from Synology
  console.log("Building photos index (first run or cache expired)…");
  const photos = await client.listAllPhotos(sid);
  const fresh = buildPhotosIndex(photos, config.cache.ttlSeconds);

  // Try to load any prior index file (even if expired) to carry over sent_at
  let old = null;
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    old = JSON.parse(raw);
  } catch {
    // no old index present; that's fine
  }

  const merged = mergeSent(old, fresh);
  await savePhotosIndex(merged);
  return merged;
}

async function runOnce() {
  const client = new SynologyClient({
    ip: config.nasIp,
    user: config.user,
    password: config.password,
    fotoSpace: config.fotoSpace,
  });

  // Build/refresh cache and carry forward sent_at
  const sid = await client.authenticate();
  const index = await getOrBuildIndex(client, sid);

  const today = new Date();
  const bucket = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  // All entries for today's month/day
  const allToday = entriesForBucket(index, bucket);

  // Candidates: photos taken on this day in past years only
  const candidates = allToday.filter((p) => {
    const y = new Date(p.time * 1000).getFullYear();
    return y < today.getFullYear();
  });

  console.log(`Candidates for ${bucket} (past years): ${candidates.length}`);
  if (candidates.length === 0) {
    console.warn("No matching photos for this day in past years.");
    return;
  }

  // Filter to unsent (no sent_at)
  let pool = candidates.filter((p) => !p.sent_at);

  // If exhausted, clear only this bucket and retry once
  if (pool.length === 0) {
    console.log(`All photos for ${bucket} were already sent. Resetting that bucket…`);
    clearBucket(index, bucket);
    pool = candidates.slice();
  }

  if (pool.length === 0) {
    console.warn("No candidates to send after reset.");
    return;
  }

  // Pick one at random
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const photoDate = new Date(picked.time * 1000);

  // Location parts for the message body
  const addr = picked?.address || {};
  const locationParts = [addr.country, addr.state, addr.county, addr.city].filter(Boolean);

  // Build thumbnail URL (let notifier fetch by URL)
  const thumbnailUrl = client.getThumbnailUrl(sid, picked, { size: config.thumbnailSize });

  // Compose body text
  const text = buildSmsText({ photoDate, locationParts });

  console.log(`Sending via Apprise: ${text}`);

  // Send with URL attachment
  await sendApprise({
    title: "Memory",
    body: text,
    attachments: [thumbnailUrl],
  });

  // Mark as sent in-memory, then persist atomically
  markSentInIndex(index, photoUID(picked), new Date().toISOString());
  await savePhotosIndex(index);

  console.log("Notification sent and recorded.");
}

// Scheduling: randomized sender if enabled; otherwise cron or one-shot
if (randomCfg.enabled) {
  startRandomScheduler(() => runOnce());
} else if (!config.cronExpression) {
  runOnce().catch((err) => {
    console.error("Run failed:", err);
    process.exitCode = 1;
  });
} else {
  console.log(`Scheduling with cron: ${config.cronExpression}`);
  cron.schedule(config.cronExpression, () => {
    runOnce().catch((err) => console.error("Scheduled run failed:", err));
  });
}
