export function photoUID(photo) {
  const cacheKey = photo?.additional?.thumbnail?.cache_key;
  const fromCache = cacheKey?.split("_")?.[0];
  return String(fromCache || photo.id);
}

export function calculateYearsAgo(date) {
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  const beforeAnniversary =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}
