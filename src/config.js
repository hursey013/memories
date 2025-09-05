import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key, optional = false) => {
  const v = process.env[key];
  if (!optional && (!v || v.trim() === "")) {
    throw new Error(`Missing required env: ${key}`);
  }
  return v;
};

export const config = {
  nasIp: requireEnv("NAS_IP"),
  user: requireEnv("USER_ID"),
  password: requireEnv("USER_PASSWORD"),
  fotoSpace: process.env.FOTO_TEAM === "true" ? "FotoTeam" : "Foto",
  thumbnailSize: process.env.THUMBNAIL_SIZE || "xl",
  apprise: {
    url: process.env.APPRISE_URL || "http://synology.lan:8000",
    key: process.env.APPRISE_KEY || null, // if using stateful
    urls: process.env.APPRISE_URLS || null, // if using stateless
  },
  cronExpression: requireEnv("CRON_EXPRESSION", true) || null,
};
