/** Minimal Apprise API client: POST /notify with optional KEY. */
import { Buffer } from "node:buffer";

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

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Compose the HTML payload for an inline-email notification.
 * @param {{ body?: string|null, inlineImageData?: string|null }} param0 Render options.
 * @returns {string} HTML body ready for Apprise.
 */
function buildEmailBody({ body, inlineImageData }) {
  const fragments = [];
  const safeBody = escapeHtml(body || "");
  if (safeBody) fragments.push(`<p>${safeBody}</p>`);
  if (inlineImageData) {
    const imageSrc = escapeHtml(inlineImageData);
    fragments.push(
      `<p><img src="${imageSrc}" alt="Memories photo" style="max-width:100%; height:auto;"/></p>`
    );
  }
  const html = fragments.join("");
  return html || "<p>Enjoy today’s Memory!</p>";
}

/**
 * Fetch an image and convert it to a base64 data URI for inline embedding.
 * @param {string|null} url Remote image URL to fetch.
 * @returns {Promise<string|null>} Data URI or null when fetch fails.
 */
async function buildInlineImageData(url) {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const base64 = buffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Submit a notification to Apprise (HTML inline email or standard payload).
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

  let useEmailFormatting = config.apprise.inlineEmail === true;
  const firstAttachment = attachments.find(
    (a) => typeof a === "string" && a.trim()
  );
  const inlineImageData = useEmailFormatting
    ? await buildInlineImageData(firstAttachment)
    : null;

  if (useEmailFormatting && !inlineImageData && !body) {
    // No way to build a meaningful HTML email, so fall back to standard behavior.
    useEmailFormatting = false;
  }

  if (useEmailFormatting) {
    const emailBody = buildEmailBody({ body, inlineImageData });
    const payload = {
      format: "html",
      body: emailBody,
    };
    if (title) payload.title = title;
    if (tag) payload.tag = tag;
    if (!config.apprise.key) {
      if (!urls)
        throw new Error(
          "Apprise stateless mode requires APPRISE_URLS (comma-separated)."
        );
      payload.urls = urls;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Apprise failed: ${res.status} ${text}`);
    }
    return;
  }

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

export { buildEmailBody };
