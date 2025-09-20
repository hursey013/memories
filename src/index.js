import cron from "node-cron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendApprise } from "./apprise.js";
import { selectFromBursts } from "./burst.js";
import { config } from "./config.js";
import { buildMessage } from "./message.js";
import {
  loadSent,
  saveSent,
  wasSent,
  markSent,
  clearSentForDay,
  makeDayKey,
} from "./sent.js";
import { SynologyClient } from "./synology.js";
import { photoUID, calculateYearsAgo } from "./utils.js";
import { sortPhotosByWeight } from "./weight.js";

console.log(`🌅 Memories starting at ${new Date().toString()}`);

export async function runOnce() {
  const client = new SynologyClient({
    ip: config.synology.ip,
    user: config.synology.user,
    password: config.synology.password,
    useTeamSpace: config.synology.useTeamSpace,
  });

  const sid = await client.authenticate();
  try {
    const offsetDays = config.synology.dayOffset || 0;
    const targetDate = new Date();
    if (offsetDays !== 0) targetDate.setDate(targetDate.getDate() + offsetDays);
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const dayKey = makeDayKey(month, day);

    if (offsetDays !== 0) {
      console.log(
        `Applying day offset (${offsetDays}) -> querying ${month}/${day}`
      );
    }

    // 1) Ask the NAS only for items for this calendar day across prior years
    const items = await client.listByMonthDayViaRanges(sid, { month, day });

    // 2) Rank photos
    const filtered = sortPhotosByWeight(items);

    // 3) Filter unsent and select within "bursts" (photos within 5s)
    let sent = await loadSent(dayKey);
    let candidates = filtered.filter((p) => !wasSent(sent, photoUID(p)));
    if (candidates.length === 0) {
      const cleared = await clearSentForDay(dayKey);
      if (cleared) {
        sent = {};
        console.log(
          `Reset sent cache for ${dayKey} so we can revisit the full photo stack.`
        );
        candidates = filtered.filter((p) => !wasSent(sent, photoUID(p)));
      }
      return;
    }
    console.log(
      `Found ${candidates.length} photos from ${month}/${day} to consider.`
    );

    // 4) Detect bursts of photos
    const { chosen, burst: chosenBurst } = selectFromBursts(candidates);

    // 5) Compose and send via Apprise
    const photoDate = new Date(chosen.time * 1000);

    await sendApprise({
      title: `Memories (${calculateYearsAgo(photoDate)} years ago)`,
      body: buildMessage({
        photoDate,
        address: chosen?.additional?.address,
      }),
      attachments: [client.getThumbnailUrl(sid, chosen)],
    });

    // 6) Record sent: chosen + all other photos from the chosen burst
    const whenISO = new Date().toISOString();
    for (const p of chosenBurst) {
      const timestampMs =
        typeof p?.time === "number" && Number.isFinite(p.time)
          ? p.time * 1000
          : null;
      const photoDateForEntry = timestampMs ? new Date(timestampMs) : photoDate;
      markSent(sent, photoUID(p), {
        whenISO,
        photoDate: photoDateForEntry,
        photoTimestamp: timestampMs,
      });
    }
    await saveSent(dayKey, sent);

    console.log(
      `Notification sent. Burst size: ${chosenBurst.length}. Chosen UID: ${photoUID(
        chosen
      )}`,
      chosen
    );
  } finally {
    await client.logout(sid);
  }
}

const modulePath = fileURLToPath(import.meta.url);
const isDirectRun = path.resolve(process.argv[1] || "") === modulePath;

if (!config.cronExpression) {
  if (isDirectRun) {
    runOnce().catch((err) => {
      console.error("Run failed:", err);
      process.exitCode = 1;
    });
  }
} else if (isDirectRun) {
  console.log(`Scheduling with cron: ${config.cronExpression}`);
  cron.schedule(config.cronExpression, () => {
    runOnce().catch((err) => console.error("Scheduled run failed:", err));
  });
}
