import cron from "node-cron";

import { config } from "./config.js";
import { SynologyClient } from "./synology.js";
import { buildMessage } from "./message.js";
import { sendApprise } from "./apprise.js";
import { loadSent, saveSent, wasSent, markSent } from "./sent.js";
import { photoUID } from "./lib/photoUid.js";

async function runOnce() {
  const sent = await loadSent();

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
    const ignored = config.ignoredPeople.map((x) => x.toLowerCase());
    const filtered = items.filter((p) => {
      const people = p?.additional?.person?.map((o) => String(o.name || "").toLowerCase()) || [];
      return !people.some((name) => ignored.includes(name));
    });

    // 3) Choose first unsent at random
    const candidates = filtered.filter((p) => !wasSent(sent, photoUID(p)));
    if (candidates.length === 0) {
      console.log("No new items to send for today's bucket.");
      return;
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // 4) Compose and send via Apprise
    const taken = new Date((chosen.time || chosen.created_time) * 1000);
    const locationParts = Object.entries(chosen?.additional?.address || {})
      .filter(([key]) => !key.endsWith("_id"))
      .filter(([_, value]) => Boolean(value))
      .map(([_, value]) => value);

    const body = buildMessage({ photoDate: taken, locationParts });
    const thumbUrl = client.getThumbnailUrl(sid, chosen);

    await sendApprise({
      title: "Memories",
      body,
      attachments: [thumbUrl],
    });

    // 5) Record sent
    markSent(sent, photoUID(chosen), new Date().toISOString());
    await saveSent(sent);

    console.log("Notification sent and recorded");
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
