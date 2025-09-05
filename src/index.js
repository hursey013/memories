import cron from "node-cron";

import { config, randomCfg } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildSmsText } from "./templates/smsText.js";
import { sendApprise } from "./notify/appriseApi.js";
import { loadPhotosIndex, savePhotosIndex } from "./cache/photosIndex.js";
import { buildPhotosIndex } from "./cache/buildIndex.js";
import { startRandomScheduler } from "./schedule/randomSender.js";

// PocketBase-based "already sent" helpers
import {
  photoUID,
  bucketKeyFromUnix,
  loadSentSet,
  markSent,
  clearBucket,
} from "./db/sentStore.pb.js";

async function getOrBuildIndex(client, sid) {
  if (process.env.FORCE_REFRESH === "1") {
    await savePhotosIndex({ built_at: "1970-01-01T00:00:00Z", ttl_seconds: 0, buckets: {} });
  }
  const cached = await loadPhotosIndex();
  if (cached) return cached;

  console.log("Building photos index (first run or cache expired)…");
  const photos = await client.listAllPhotos(sid);
  const index = buildPhotosIndex(photos, config.cache.ttlSeconds);
  await savePhotosIndex(index);
  return index;
}

async function runOnce() {
  const client = new SynologyClient({
    ip: config.nasIp,
    user: config.user,
    password: config.password,
    fotoSpace: config.fotoSpace,
  });

  console.log("Authenticating to Synology…");
  const sid = await client.authenticate();

  const index = await getOrBuildIndex(client, sid);

  const today = new Date();
  const bucket = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Gather candidates for today but from past years only
  const candidates = (index.buckets[bucket] || []).filter((p) => {
    const y = new Date(p.time * 1000).getFullYear();
    return y < today.getFullYear();
  });

  console.log(`Candidates for ${bucket} (past years): ${candidates.length}`);
  if (candidates.length === 0) {
    console.warn("No matching photos for this day in past years.");
    return;
  }

  // Load "already sent" set for today's bucket from PocketBase
  const sentSet = await loadSentSet(bucket);

  // Filter out already-sent photos
  let pool = candidates.filter((p) => !sentSet.has(photoUID(p)));

  // If we've exhausted the pool for this day, reset just this bucket and try again
  if (pool.length === 0) {
    console.log(`All photos for ${bucket} were already sent. Resetting that bucket…`);
    await clearBucket(bucket);
    pool = candidates.slice();
  }

  if (pool.length === 0) {
    console.warn("No candidates to send after reset.");
    return;
  }

  // Pick one to send
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const photoDate = new Date(picked.time * 1000);
  const locationParts = picked?.address || {}; // note: index stores a flattened 'address' field
  const thumbnailUrl = client.getThumbnailUrl(sid, picked, { size: config.thumbnailSize });

  // Compose the SMS/MMS text body
  const text = buildSmsText({ photoDate, locationParts });

  console.log(`Sending via Apprise: ${text}`);

  // Send with URL attachment (no binary upload logic)
  await sendApprise({
    title: "Memory",
    body: text,
    attachments: [thumbnailUrl], // let the notifier fetch the image by URL
  });

  // Mark as sent in PocketBase (idempotent because photo_uid is unique)
  await markSent({
    photoUID: photoUID(picked),
    bucket: bucketKeyFromUnix(picked.time),
    takenAt: picked.time,
  });

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
