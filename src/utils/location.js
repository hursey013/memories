export function formatLocation(parts) {
  const { country, state, county, city } = parts || {};
  return [country, state, county, city].filter(Boolean).join(", ");
}
