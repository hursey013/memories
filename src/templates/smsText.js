export function buildSmsText({ photoDate, locationParts }) {
  // Example: "Taken on July 14, 2019 — Charlottesville, VA, USA"
  const dateText = photoDate.toLocaleString("en-US", { dateStyle: "long" });
  return locationParts.length
    ? `Taken on ${dateText} — ${locationParts.join(", ")}`
    : `Taken on ${dateText}`;
}
