import cron from "node-cron";

import { config } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildMessage } from "./message.js";
import { sendApprise } from "./apprise.js";
import { loadSent, saveSent, wasSent, markSent } from "./sent.js";
import { photoUID, calculateYearsAgo } from "./utils.js";
import { sortPhotosByWeight } from "./weight.js";
import { selectFromBursts } from "./burst.js";

console.log(`Started at: ${new Date().toString()}`);

async function runOnce() {
  const client = new SynologyClient({
    ip: config.synology.ip,
    user: config.synology.user,
    password: config.synology.password,
    fotoSpace: config.synology.fotoSpace ? "FotoTeam" : "Foto",
  });

  const sid = await client.authenticate();
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // 1) Ask the NAS only for items for this calendar day across prior years
    const items = await client.listByMonthDayViaRanges(sid, { month, day });

    // 2) Rank photos
    const filtered = sortPhotosByWeight(items);

    // 3) Filter unsent and select within "bursts" (photos within 5s)
    const sent = await loadSent();
    const candidates = filtered.filter((p) => !wasSent(sent, photoUID(p)));
    if (candidates.length === 0) {
      console.log("No new items to send for today");
      return;
    }
    console.log(`Found ${candidates.length} photos from ${month}/${day}`);

    const { chosen, burst: chosenBurst } = selectFromBursts(candidates, {
      windowSec: 5,
    });

    // 4) Compose and send via Apprise
    const photoDate = new Date(chosen.time * 1000);

    await sendApprise({
      title: `Memories (${calculateYearsAgo(photoDate)} years ago)`,
      body: buildMessage({
        photoDate,
        address: chosen?.additional?.address,
      }),
      attachments: [client.getThumbnailUrl(sid, chosen)],
    });

    // 5) Record sent: chosen + all other photos from the chosen burst
    const whenISO = new Date().toISOString();
    for (const p of chosenBurst) {
      markSent(sent, photoUID(p), whenISO);
    }
    await saveSent(sent);

    console.log(
      `Notification sent. Burst size: ${chosenBurst.length}. Chosen UID: ${photoUID(
        chosen
      )}`
    );
  } finally {
    await client.logout(sid);
  }
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
