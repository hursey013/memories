/** Minimal Apprise API client: POST /notify with optional KEY. */
import { config } from "./config.js";

/** Build base URL and endpoint for Apprise API. */
function buildApprise() {
  const base = (config.apprise.url || "http://apprise-api:8000").replace(/\/+$/, "");
  const endpoint = config.apprise.key
    ? `${base}/notify/${encodeURIComponent(config.apprise.key)}`
    : `${base}/notify`;
  return { base, endpoint };
}

/**
 * Send a notification via Apprise.
 * Only URL attachments are supported to keep things simple and reliable.
 *
 * @param {Object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {string[]} [opts.attachments] - Array of URL strings
 * @param {string} [opts.tag]
 */
export async function sendApprise({ title, body, attachments = [], tag } = {}) {
  const { base, endpoint } = buildApprise();

  // Stateless mode requires target URLs in a form field
  const urls = config.apprise.key
    ? undefined
    : config.apprise.urls
      ? Array.isArray(config.apprise.urls)
        ? config.apprise.urls.join(",")
        : String(config.apprise.urls)
      : undefined;

  const form = new FormData();
  if (!config.apprise.key) {
    if (!urls) throw new Error("Apprise stateless mode requires APPRISE_URLS (comma-separated).");
    form.append("urls", urls);
  }
  if (title) form.append("title", title);
  if (body) form.append("body", body);
  if (tag) form.append("tag", tag);
  for (const a of attachments) {
    if (typeof a === "string" && a.trim()) form.append("attachment", a.trim());
  }

  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apprise failed: ${res.status} ${text}`);
  }
}
