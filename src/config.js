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

const parseBool = (v, def = false) => {
  if (v == null) return def;
  const s = String(v)
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(s);
};

const parseDays = (s) =>
  s
    ? s
        .split(",")
        .map((x) => Number(String(x).trim()))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : [0, 1, 2, 3, 4, 5, 6];

export const config = {
  nasIp: requireEnv("NAS_IP"),
  user: requireEnv("USER_ID"),
  password: requireEnv("USER_PASSWORD"),
  fotoSpace: process.env.FOTO_TEAM === "true" ? "FotoTeam" : "Foto",
  thumbnailSize: process.env.THUMBNAIL_SIZE || "l",
  apprise: {
    url: process.env.APPRISE_URL || "http://apprise-api:8000",
    key: process.env.APPRISE_KEY || null,
    urls: process.env.APPRISE_URLS || null,
  },
  pb: {
    url: process.env.PB_URL || "http://pocketbase:8090",
    adminEmail: process.env.PB_ADMIN_EMAIL || "",
    adminPassword: process.env.PB_ADMIN_PASSWORD || "",
    collection: process.env.PB_COLLECTION || "sent_photos",
  },
  cache: {
    path: process.env.PHOTOS_INDEX_PATH || "./cache/photos-index.json",
    ttlSeconds: toInt(process.env.PHOTOS_INDEX_TTL_SECONDS, 7 * 24 * 60 * 60),
  },
  http: {
    timeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 15000),
    retries: toInt(process.env.HTTP_RETRIES, 1),
  },
  cronExpression: process.env.CRON_EXPRESSION || null,
};
