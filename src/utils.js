/**
 * Resolve a stable identifier for a Synology photo.
 * @param {any} photo Photo record from the API.
 * @returns {string} UID derived from thumbnail cache key or photo id.
 */
export function photoUID(photo) {
  const cacheKey = photo?.additional?.thumbnail?.cache_key;
  const fromCache = cacheKey?.split("_")?.[0];
  return String(fromCache || photo.id);
}

/**
 * Determine how many full years have elapsed since the provided date.
 * @param {Date} date Original capture date.
 * @returns {number} Whole years elapsed.
 */
export function calculateYearsAgo(date) {
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  const beforeAnniversary =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}
