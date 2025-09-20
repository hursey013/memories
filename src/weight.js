import { config } from "./config.js";

/**
 * Sort the provided photo items by their calculated nostalgia weight.
 * @param {Array<any>} items Photo records returned from Synology.
 * @returns {Array<any>} Items sorted in descending weight order.
 */
export function sortPhotosByWeight(items) {
  const {
    ignoredPeople = [],
    favoritePeople = [],
    minWeight = Number.NEGATIVE_INFINITY,
  } = config.synology;
  // 1) Filter out photos containing ignored people
  const filtered = (items || []).filter((p) => {
    const people =
      p?.additional?.person?.map((o) => String(o?.name || "").toLowerCase()) ||
      [];
    return !people.some((name) => ignoredPeople.includes(name));
  });

  // 2) Score each photo
  const scored = filtered.map((p) => ({
    ...p,
    weight: calculateWeight(p, favoritePeople),
  }));

  const threshold = Number.isFinite(minWeight) ? minWeight : Number.NEGATIVE_INFINITY;
  const aboveThreshold = scored.filter(
    (p) => (p.weight ?? Number.NEGATIVE_INFINITY) >= threshold
  );

  // 3) Sort best-first
  return aboveThreshold.sort((a, b) => b.weight - a.weight);
}

/**
 * Compute the nostalgia weight for a photo.
 * @param {any} p Photo record with `additional` metadata.
 * @param {string[]} [favoritePeopleOverride] Optional favorite people list for testing overrides.
 * @returns {number} Calculated weight (higher is better).
 */
export function calculateWeight(p, favoritePeopleOverride = config.synology.favoritePeople) {
  let score = 0;

  // ---------- People-based signals ----------
  const peopleObjs = Array.isArray(p?.additional?.person)
    ? p.additional.person
    : [];
  const peopleNames = peopleObjs.map((o) => String(o?.name || "").trim());
  const namedPeople = peopleNames.filter((n) => n.length > 0);
  const unnamedCount = Math.max(0, peopleNames.length - namedPeople.length);

  // Favorites (strong signal)
  const favoriteList = Array.isArray(favoritePeopleOverride)
    ? favoritePeopleOverride
    : [];
  const favoriteCount = namedPeople.filter((n) =>
    favoriteList.includes(n.toLowerCase())
  ).length;
  score += clamp(favoriteCount * 5, 0, 10); // up to +10

  // Named people (user-curated)
  score += clamp(namedPeople.length * 2, 0, 8); // up to +8

  // Face count (social context)
  score += clamp(peopleNames.length * 1, 0, 4); // up to +4

  // Unnamed faces (slight penalty)
  score -= clamp(unnamedCount * 1, 0, 3); // up to -3

  // ---------- Quality/context signals ----------
  const exif = p?.additional?.exif || {};
  const hasAnyExif = Object.keys(exif).length > 0;
  const model =
    exif.Model || exif.model || exif.CameraModel || exif.cameraModel || "";
  const hasCameraModel = typeof model === "string" && model.trim().length > 0;

  if (hasAnyExif) score += 1;
  if (hasCameraModel) score += 3;
  if (!hasAnyExif) score -= 4;

  // ---------- Date nostalgia bonus (using epoch seconds) ----------
  const ageYears = yearsSinceSeconds(p.time);
  if (ageYears >= 3 && ageYears <= 10) score += 2;
  else if (ageYears > 10 && ageYears <= 20) score += 1;

  score += Math.random() * 0.25;

  return score;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function yearsSinceSeconds(epochSeconds) {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = nowSec - epochSeconds;
  return diffSec / (60 * 60 * 24 * 365.25);
}
