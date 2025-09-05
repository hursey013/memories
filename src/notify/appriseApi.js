// Simple Apprise API client for Node (ESM).
// Supports stateful (/notify/{KEY}) or stateless (/notify with urls=...).
import { config } from "../config.js";

function endpointPath() {
  if (config.apprise.key) return `/notify/${encodeURIComponent(config.apprise.key)}`;
  return "/notify"; // stateless
}

/**
 * Send a notification through Apprise API.
 * @param {Object} opts
 * @param {string} [opts.title] - Optional title
 * @param {string} [opts.body]  - Message body (text)
 * @param {string[]} [opts.attachments] - Array of URLs or file paths
 * @param {string|string[]} [opts.tag]   - Optional apprise tag(s)
 * @returns {Promise<void>}
 */
export async function sendApprise({ title, body, attachments = [], tag } = {}) {
  const base = config.apprise.url.replace(/\/+$/, "");
  const path = endpointPath();
  const url = `${base}${path}`;

  // Decide JSON vs multipart (attachments need multipart)
  const usingAttachments = attachments && attachments.length > 0;

  // Payload fields common to both modes
  const baseFields = { title, body };
  if (tag) baseFields.tag = Array.isArray(tag) ? tag.join(",") : tag;

  // --- Stateful mode: /notify/{KEY} (no urls in request) ---
  if (config.apprise.key) {
    if (!usingAttachments) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseFields),
      });
      if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
      return;
    }
    const form = new FormData();
    Object.entries(baseFields).forEach(([k, v]) => v != null && form.append(k, v));
    for (const a of attachments) form.append("attachment", a);
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
    return;
  }

  // --- Stateless mode: /notify + urls=... ---
  if (!config.apprise.urls) {
    throw new Error("Apprise stateless mode requires APPRISE_URLS in .env");
  }
  const targets = Array.isArray(config.apprise.urls)
    ? config.apprise.urls.join(",")
    : config.apprise.urls;

  if (!usingAttachments) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baseFields, urls: targets }),
    });
    if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
    return;
  }
  const form = new FormData();
  Object.entries(baseFields).forEach(([k, v]) => v != null && form.append(k, v));
  form.append("urls", targets);
  for (const a of attachments) form.append("attachment", a);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
}
