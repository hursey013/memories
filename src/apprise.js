/** Minimal Apprise API client: POST /notify with optional KEY. */
import { config } from "./config.js";

/** Build base URL and endpoint for Apprise API. */
function buildApprise() {
  const base = (config.apprise.url || "http://apprise-api:8000").replace(
    /\/+$/,
    ""
  );
  const endpoint = config.apprise.key
    ? `${base}/notify/${encodeURIComponent(config.apprise.key)}`
    : `${base}/notify`;
  return { base, endpoint };
}

/**
 * Submit a notification to Apprise.
 * @param {{ title?: string, body?: string, attachments?: string[], tag?: string }} opts Message details.
 * @returns {Promise<void>}
 */
export async function sendApprise({ title, body, attachments = [], tag } = {}) {
  const { endpoint } = buildApprise();

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
    if (!urls)
      throw new Error(
        "Apprise stateless mode requires APPRISE_URLS (comma-separated)."
      );
    form.append("urls", urls);
  }
  if (title) form.append("title", title);
  if (tag) form.append("tag", tag);
  if (body) form.append("body", body);

  for (const a of attachments) {
    if (typeof a === "string" && a.trim()) form.append("attachment", a.trim());
  }

  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apprise failed: ${res.status} ${text}`);
  }
}
