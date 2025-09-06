export function photoUID(photo) {
  const cacheKey = photo?.cache_key || photo?.additional?.thumbnail?.cache_key;
  const fromCache = cacheKey?.split("_")?.[0];
  return String(fromCache || photo.id);
}
