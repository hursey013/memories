import cron from "node-cron";

import { config } from "./config.js";
import { SynologyClient } from "./synology.js";
import { sendApprise } from "./notify/appriseApi.js";
import { buildSmsText } from "./templates/smsText.js";

async function runOnce() {
  const client = new SynologyClient({
    ip: config.nasIp,
    user: config.user,
    password: config.password,
    fotoSpace: config.fotoSpace,
  });

  console.log("Authenticating to Synology…");
  const sid = await client.authenticate();

  console.log("Fetching photo index…");
  const photos = await client.listAllPhotos(sid);
  console.log(`Found ${photos.length} photos total.`);

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const candidates = client.filterPhotosByMonthDay(photos, day, month);
  console.log(`Candidates for ${month}/${day} (past years): ${candidates.length}`);

  if (candidates.length === 0) {
    console.warn("No matching photos for this day in past years. Skipping email.");
    return;
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const photoDate = new Date(picked.time * 1000);
  const locationParts = picked?.additional?.address || {};
  const thumbnailUrl = client.getThumbnailUrl(sid, picked, { size: config.thumbnailSize });
  const text = buildSmsText({ photoDate, locationParts });

  console.log(`Sending via Apprise: ${text}`);

  await sendApprise({
    title: "Memory",
    body: text,
    attachments: [thumbnailUrl], // Apprise can fetch an HTTP(S) URL
    // tag: "family" // optional: target a subset of your stored destinations
  });

  console.log("Notification sent.");
}

if (!config.cronExpression) {
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
