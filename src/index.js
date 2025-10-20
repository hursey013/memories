import cron from "node-cron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendApprise } from "./apprise.js";
import { selectFromBursts } from "./burst.js";
import { config } from "./config.js";
import {
  notifyHealthcheckFailure,
  notifyHealthcheckStart,
  notifyHealthcheckSuccess,
} from "./healthchecks.js";
import logger from "./logger.js";
import { buildMessage } from "./message.js";
import {
  loadSent,
  saveSent,
  markSent,
  clearSentForDay,
  makeDayKey,
} from "./sent.js";
import { SynologyClient } from "./synology.js";
import { photoUID, calculateYearsAgo } from "./utils.js";
import { sortPhotosByWeight } from "./weight.js";

logger.info({
  event: "startup",
  message: "Memories starting",
  timestamp: new Date().toISOString(),
});

/**
 * Execute a single fetch/filter/send cycle for the current (or offset) day.
 * @returns {Promise<void>}
 */
export async function runOnce() {
  const startedAt = Date.now();
  let sid;
  let dayKey = null;

  await notifyHealthcheckStart();

  const client = new SynologyClient({
    ip: config.synology.ip,
    user: config.synology.user,
    password: config.synology.password,
    useTeamSpace: config.synology.useTeamSpace,
  });

  try {
    sid = await client.authenticate();

    const offsetDays = config.synology.dayOffset || 0;
    const targetDate = new Date();
    if (offsetDays !== 0) targetDate.setDate(targetDate.getDate() + offsetDays);
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    dayKey = makeDayKey(month, day);

    if (offsetDays !== 0) {
      logger.info({
        event: "date.offset",
        offsetDays,
        month,
        day,
        dayKey,
      });
    }

    // 1) Ask the NAS only for items for this calendar day across prior years
    const items = await client.listByMonthDayViaRanges(sid, { month, day });

    // 2) Load sent history and rank photos with repeat penalties applied
    let sent = await loadSent(dayKey);
    const filterForRun = (pool) => {
      const now = new Date();
      return pool.filter((p) => {
        const entry = sent?.[photoUID(p)];
        if (!entry) return true;
        const whenISO = entry.when || entry.whenISO;
        if (!whenISO) return true;
        const last = new Date(whenISO);
        if (Number.isNaN(last.valueOf())) return true;
        return !(
          last.getFullYear() === now.getFullYear() &&
          last.getMonth() === now.getMonth() &&
          last.getDate() === now.getDate()
        );
      });
    };

    let ranked = sortPhotosByWeight(items, sent);
    let candidates = filterForRun(ranked);

    const sendSkipPing = async (reason, candidateCount = 0) => {
      await notifyHealthcheckSuccess({
        status: "skipped",
        reason,
        dayKey,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        rankedCount: ranked.length,
        candidateCount,
      });
    };

    if (candidates.length === 0) {
      const cleared = await clearSentForDay(dayKey);
      if (cleared) {
        sent = {};
        logger.info({ event: "cache.reset", dayKey, reason: "no_candidates" });
        ranked = sortPhotosByWeight(items, sent);
        candidates = filterForRun(ranked);
      }
      if (candidates.length === 0) {
        await sendSkipPing(
          cleared ? "no_candidates_after_reset" : "no_candidates",
          0
        );
        return;
      }
    }
    logger.info({
      event: "photos.considered",
      count: candidates.length,
      repeats: candidates.filter((p) => p.timesSent > 0).length,
      month,
      day,
      dayKey,
    });

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

    logger.info({
      event: "apprise.sent",
      burstSize: chosenBurst.length,
      chosen,
      dayKey,
    });

    await notifyHealthcheckSuccess({
      status: "sent",
      dayKey,
      burstSize: chosenBurst.length,
      rankedCount: ranked.length,
      candidateCount: candidates.length,
      repeatsConsidered: candidates.filter((p) => p.timesSent > 0).length,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    await notifyHealthcheckFailure({
      status: "error",
      dayKey,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      error:
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown error",
    });
    throw err;
  } finally {
    if (sid) {
      await client.logout(sid);
    }
  }
}

const modulePath = fileURLToPath(import.meta.url);
const isDirectRun = path.resolve(process.argv[1] || "") === modulePath;

if (!config.cronExpression) {
  if (isDirectRun) {
    runOnce().catch((err) => {
      logger.error({ event: "run.failed", err });
      process.exitCode = 1;
    });
  }
} else if (isDirectRun) {
  logger.info({ event: "cron.schedule", expression: config.cronExpression });
  cron.schedule(config.cronExpression, () => {
    runOnce().catch((err) => logger.error({ event: "run.failed", err }));
  });
}
