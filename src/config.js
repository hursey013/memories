/** Loads and validates environment configuration for the app. */
import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key, optional = false) => {
  const v = process.env[key];
  if (!optional && (!v || String(v).trim() === "")) {
    throw new Error(`Missing required env: ${key}`);
  }
  return v;
};

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const config = {
  synology: {
    ip: requireEnv("NAS_IP"),
    user: requireEnv("USER_ID"),
    password: requireEnv("USER_PASSWORD"),
    useTeamSpace: process.env.FOTO_TEAM === "true",
    favoritePeople: (process.env.FAVORITE_PEOPLE || "")
      .split(",")
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean),
    ignoredPeople: (process.env.IGNORED_PEOPLE || "")
      .split(",")
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean),
    yearsBack: toInt(process.env.YEARS_BACK || 0),
    minYear: toInt(process.env.MIN_YEAR || 2000),
    sentDir: process.env.SENT_DIR || "./cache",
    dayOffset: toInt(process.env.DAY_OFFSET || 0),
    minWeight: toInt(process.env.MIN_WEIGHT, 0),
    repeatPenalty: toInt(process.env.REPEAT_PENALTY, 3),
    repeatPenaltyCap: toInt(process.env.REPEAT_PENALTY_CAP, 12),
  },
  apprise: {
    url: process.env.APPRISE_URL || "http://apprise-api:8000",
    key: process.env.APPRISE_KEY || null,
    urls: process.env.APPRISE_URLS || null,
  },
  http: {
    timeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 15000),
    retries: toInt(process.env.HTTP_RETRIES, 1),
  },
  healthchecks: {
    pingUrl: process.env.HEALTHCHECKS_PING_URL || null,
  },
  cronExpression: process.env.CRON_EXPRESSION || null,
};
