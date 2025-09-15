import cron from "node-cron";

import { config } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildMessage } from "./message.js";
import { sendApprise } from "./apprise.js";
import { loadSent, saveSent, wasSent, markSent } from "./sent.js";
import { photoUID, calculateYearsAgo } from "./utils.js";

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

    // 2) Filter ignored people (if Synology returns people metadata)
    const ignored = config.synology.ignoredPeople.map((x) => x.toLowerCase());
    const filtered = items.filter((p) => {
      const people =
        p?.additional?.person?.map((o) => String(o.name || "").toLowerCase()) ||
        [];
      return !people.some((name) => ignored.includes(name));
    });

    // 3) Choose first unsent at random
    const sent = await loadSent();
    const candidates = filtered.filter((p) => !wasSent(sent, photoUID(p)));
    if (candidates.length === 0) {
      console.log("No new items to send for today");
      return;
    }
    console.log(`Found ${candidates.length} photos from ${month}/${day}`);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

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

    // 5) Record sent
    markSent(sent, photoUID(chosen), new Date().toISOString());
    await saveSent(sent);

    console.log("Notification sent and recorded", chosen);
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
