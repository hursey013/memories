import { formatLocation } from "../utils/location.js";

export function buildSmsText({ photoDate, locationParts }) {
  // Example: "Taken on July 14, 2019 — Charlottesville, VA, USA"
  const dateText = photoDate.toLocaleString("en-US", { dateStyle: "long" });
  const loc = formatLocation(locationParts);
  return loc ? `Taken on ${dateText} — ${loc}` : `Taken on ${dateText}`;
}
