import fs from "node:fs/promises";
import path from "node:path";
import cron from "node-cron";

import { randomCfg } from "../config.js";

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  const mins = (h * 60) + (m || 0);
  return ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
}

export function isQuietNow(now = new Date()) {
  const start = toMinutes(randomCfg.quietStart);
  const end = toMinutes(randomCfg.quietEnd);
  const mins = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  if (start < end) return mins >= start && mins < end;
  return mins >= start || mins < end;
}

function isActiveDay(now = new Date()) {
  return randomCfg.activeDays.includes(now.getDay());
}

async function readState() {
  try {
    const raw = await fs.readFile(randomCfg.statePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { date: "", count: 0, lastSentTs: 0 };
  }
}

async function writeStateAtomic(state) {
  const dir = path.dirname(randomCfg.statePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = randomCfg.statePath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(state), "utf-8");
  await fs.rename(tmp, randomCfg.statePath);
}

function activeWindowMinutes() {
  const start = toMinutes(randomCfg.quietEnd);
  const end = toMinutes(randomCfg.quietStart);
  if (start === end) return 24 * 60;
  if (start < end) return end - start;
  return (24 * 60 - start) + end;
}

function shouldSendOnTick(now, state) {
  if (!isActiveDay(now) || isQuietNow(now)) return false;
  const todayStr = now.toISOString().slice(0, 10);
  const sameDay = state.date === todayStr;
  const countToday = sameDay ? state.count : 0;
  if (countToday >= randomCfg.maxPerDay) return false;
  const minutesSince = state.lastSentTs ? (now.getTime() - state.lastSentTs) / 60000 : Infinity;
  if (minutesSince < randomCfg.minGapMin) return false;
  const activeMin = Math.max(1, activeWindowMinutes());
  const p = Math.min(1, (randomCfg.lambdaPerDay / activeMin) * randomCfg.tickMinutes);
  return Math.random() < p;
}

export function startRandomScheduler(callback) {
  const tick = Math.max(1, Math.floor(randomCfg.tickMinutes));
  const expr = `*/${tick} * * * *`;
  console.log(`[random-scheduler] enabled; cron=${expr} λ/day=${randomCfg.lambdaPerDay}, cap=${randomCfg.maxPerDay}`);
  cron.schedule(expr, async () => {
    try {
      const now = new Date();
      const state = await readState();
      if (shouldSendOnTick(now, state)) {
        await callback();
        const todayStr = now.toISOString().slice(0, 10);
        const sameDay = state.date === todayStr;
        const newState = {
          date: todayStr,
          count: (sameDay ? state.count : 0) + 1,
          lastSentTs: Date.now(),
        };
        await writeStateAtomic(newState);
      }
    } catch (err) {
      console.error("[random-scheduler] tick error:", err);
    }
  });
}
