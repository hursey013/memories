/** HTTP helpers with timeout/retry and optional insecure TLS. */
export async function fetchJson(
  url,
  { timeoutMs = 15000, retries = 0, insecure = false } = {}
) {
  let attempt = 0;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    while (true) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        return await res.json();
      } catch (err) {
        if (attempt++ < retries) continue;
        throw err;
      }
    }
  } finally {
    if (insecure) {
      if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
  }
}
