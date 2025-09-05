import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key, optional = false) => {
  const v = process.env[key];
  if (!optional && (!v || v.trim() === "")) {
    throw new Error(`Missing required env: ${key}`);
  }
  return v;
};

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const parseDays = (s) =>
  (s ? s.split(',').map(x => Number(x.trim())).filter(n => Number.isInteger(n) && n>=0 && n<=6) : [0,1,2,3,4,5,6]);

export const config = {
  nasIp: requireEnv("NAS_IP"),
  user: requireEnv("USER_ID"),
  password: requireEnv("USER_PASSWORD"),
  fotoSpace: process.env.FOTO_TEAM === "true" ? "FotoTeam" : "Foto",
  thumbnailSize: process.env.THUMBNAIL_SIZE || "l",
  apprise: {
    url: process.env.APPRISE_URL || "http://localhost:8000",
    key: process.env.APPRISE_KEY || null,
    urls: process.env.APPRISE_URLS || null,
  },
  cache: {
    path: process.env.PHOTOS_INDEX_PATH || "./cache/photos-index.json",
    ttlSeconds: toInt(process.env.PHOTOS_INDEX_TTL_SECONDS, 7 * 24 * 60 * 60),
  },
  http: {
    timeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 15000),
    retries: toInt(process.env.HTTP_RETRIES, 1),
  },
  cronExpression: requireEnv("CRON_EXPRESSION", true) || null,
};

export const randomCfg = {
  enabled: (process.env.RANDOM_ENABLED || 'false').toLowerCase() === 'true',
  lambdaPerDay: Number(process.env.DAILY_RATE || 0.8),
  maxPerDay: Number(process.env.MAX_PER_DAY || 2),
  minGapMin: Number(process.env.MIN_GAP_MIN || 90),
  tickMinutes: Number(process.env.TICK_MINUTES || 5),
  quietStart: process.env.QUIET_START || '22:00',
  quietEnd: process.env.QUIET_END || '07:30',
  activeDays: parseDays(process.env.ACTIVE_DAYS || '0,1,2,3,4,5,6'),
  statePath: process.env.SCHED_STATE_PATH || './cache/schedule-state.json',
};
