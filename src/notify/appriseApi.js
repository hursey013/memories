import { config } from "../config.js";

function endpointPath() {
  if (config.apprise.key) return `/notify/${encodeURIComponent(config.apprise.key)}`;
  return "/notify";
}
const baseUrl = () => (config.apprise.url || "http://localhost:8000").replace(/\/+$/, "");

/**
 * Send a notification through Apprise API.
 * attachments: string URLs OR objects { filename, contentType, data: Buffer }
 */
export async function sendApprise({ title, body, attachments = [], tag } = {}) {
  const base = baseUrl();
  const url = `${base}${endpointPath()}`;
  const hasFileObjects = attachments.some((a) => a && typeof a === "object" && "data" in a);

  const baseFields = {};
  if (title != null) baseFields.title = title;
  if (body != null) baseFields.body = body;
  if (tag) baseFields.tag = Array.isArray(tag) ? tag.join(",") : tag;

  // Stateful mode
  if (config.apprise.key) {
    if (!attachments.length) {
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
    for (const a of attachments) {
      if (typeof a === "string") form.append("attachment", a);
      else {
        const blob = new Blob([a.data], { type: a.contentType || "application/octet-stream" });
        form.append("attachment", blob, a.filename || "attachment.bin");
      }
    }
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
    return;
  }

  // Stateless mode
  if (!config.apprise.urls) throw new Error("Apprise stateless mode requires APPRISE_URLS in .env");
  const targets = Array.isArray(config.apprise.urls) ? config.apprise.urls.join(",") : config.apprise.urls;

  if (!attachments.length || !hasFileObjects) {
    const payload = { ...baseFields, urls: targets };
    if (attachments.length && !hasFileObjects) payload.attachment = attachments;
    const res = await fetch(`${base}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
    return;
  }

  const form = new FormData();
  form.append("urls", targets);
  Object.entries(baseFields).forEach(([k, v]) => v != null && form.append(k, v));
  for (const a of attachments) {
    if (typeof a === "string") form.append("attachment", a);
    else {
      const blob = new Blob([a.data], { type: a.contentType || "application/octet-stream" });
      form.append("attachment", blob, a.filename || "attachment.bin");
    }
  }
  const res = await fetch(`${base}/notify`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Apprise failed: ${res.status} ${await res.text()}`);
}
