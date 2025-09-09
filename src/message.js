/** Formats the one-line message attached to a photo. */
export function buildMessage({ photoDate, address = {} }) {
  // Example: "Taken on July 14, 2019 — Charlottesville, VA, USA"
  const dateText = photoDate.toLocaleString("en-US", { dateStyle: "long" });
  const locationParts = Object.entries(address)
    .filter(([key]) => !key.endsWith("_id"))
    .filter(([_, value]) => Boolean(value))
    .map(([_, value]) => value);

  return locationParts.length
    ? `Taken on ${dateText} — ${locationParts.join(", ")}`
    : `Taken on ${dateText}`;
}
