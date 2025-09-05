import cron from "node-cron";

import { config, randomCfg } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildSmsText } from "./templates/smsText.js";
import { sendApprise } from "./notify/appriseApi.js";
import { loadPhotosIndex, savePhotosIndex } from "./cache/photosIndex.js";
import { buildPhotosIndex } from "./cache/buildIndex.js";
import { startRandomScheduler } from "./schedule/randomSender.js";

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
  const key = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const candidates = (index.buckets[key] || []).filter((p) => {
    const y = new Date(p.time * 1000).getFullYear();
    return y < today.getFullYear();
  });
  console.log(`Candidates for ${key} (past years): ${candidates.length}`);
  if (candidates.length === 0) {
    console.warn("No matching photos for this day in past years. Consider refreshing the index.");
    return;
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const photoDate = new Date(picked.time * 1000);
  const locationParts = picked?.address || {};
  const thumbnailUrl = client.getThumbnailUrl(sid, picked, { size: config.thumbnailSize });
  const text = buildSmsText({ photoDate, locationParts });

  console.log(`Sending via Apprise: ${text}`);

  await sendApprise({
    title: "Memories",
    body: text,
    attachments: [thumbnailUrl], // Apprise can fetch an HTTP(S) URL
    // tag: "family" // optional: target a subset of your stored destinations
  });

  console.log("Notification sent.");
}

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
