# Memories — Synology “On This Day” Notifications via Apprise

Memories picks a photo or video taken on **this day in past years** from your Synology Photos library and sends it to you via **[Apprise](https://github.com/caronc/apprise)** (SMS/MMS/Push/Email/Discord/etc.).

This repo is designed for **self‑hosters** and **open‑source contributors**. The goals:

- **Readable code** with a small, plain‑Node.js stack (no framework; ES modules).
- **Safe defaults** and clear environment variables.
- **Reproducible** dev and prod via Docker.
- **Friendly to contributions** (linting, tests, file layout).

---

## Quick start (Docker Compose)

Pick **one** of the following options.

### Option A — You ALREADY run Apprise API elsewhere

Use the provided `docker-compose.apprise-external.yaml` and point `APPRISE_URL` to your server:

```bash
cp .env.example .env
# edit .env and set APPRISE_URL=http://your-apprise-host:8000 and APPRISE_KEY if you use keys
docker compose -f docker-compose.apprise-external.yaml up -d
```

### Option B — Run Apprise API **in the same stack**

This starts both services on a private network. You’ll access Apprise API at `http://localhost:8000` for testing.

```bash
cp .env.example .env
docker compose -f docker-compose.with-apprise.yaml up -d
```

Open `http://localhost:8000` → set an **API key** in the UI → put that value into `APPRISE_KEY` in your `.env` (recommended).

---

## How it works

1. We authenticate to your **Synology Photos** (DSM) and list media with EXIF dates.
2. We build (and cache) an index keyed by **month/day** so lookups are instant.
3. On each run (manual or scheduled via `CRON_EXPRESSION`) we pick one unsent item from today’s bucket.
4. We render a short message (date/location) and call **Apprise API** to fan out to your channels.
5. We record what was sent to avoid repeats (until the cache TTL expires).

Key modules (see `src/`):

- `src/synology.js` — minimal Synology client.
- `src/cache/` — cache/index building and bookkeeping.
- `src/templates/smsText.js` — formats the text line attached to the media.
- `src/notify/appriseApi.js` — Apprise API client.
- `src/net/http.js` — tiny HTTP helpers with timeout/retries.

---

## Configuration

Copy `.env.example` to `.env` and review every option.

| Variable | Description |
|---|---|
| `NAS_IP`, `USER_ID`, `USER_PASSWORD` | Your Synology address and credentials. |
| `FOTO_TEAM` | `true` to use Team folders if you’ve enabled them. |
| `THUMBNAIL_SIZE` | One of Synology’s sizes: `xs,s,m,l,xl`. |
| `IGNORED_PEOPLE` | Comma‑separated names to exclude (case‑insensitive). |
| `PHOTOS_INDEX_PATH` | Where to store the JSON index on disk. |
| `PHOTOS_INDEX_TTL_SECONDS` | Rebuild the index after this many seconds. |
| `HTTP_TIMEOUT_MS`, `HTTP_RETRIES` | Network resilience knobs. |
| `CRON_EXPRESSION` | Standard cron string (omit to run once and exit). |
| `APPRISE_URL` | Base URL to your Apprise API server. |
| `APPRISE_KEY` | Optional Apprise KEY (recommended). |
| `APPRISE_URLS` | Alternative stateless mode: comma‑separated Apprise targets. |

> Tip: When running with `docker-compose.with-apprise.yaml`, `APPRISE_URL` can be left as `http://memories-apprise-api:8000` (the default in `.env.example`).

---

## Development

```bash
# Node 20+
npm i
npm run dev            # auto-reload (Node --watch)
npm test               # run vitest suite
npm run lint           # eslint
npm run format         # prettier
```

The app entrypoint is `src/index.js`. All modules are documented with short JSDoc headers and use explicit, named exports. No transpilation required.

---

## Production / Scheduling

Set `CRON_EXPRESSION` in `.env` for periodic sends. Example every day at 9:00am:

```
CRON_EXPRESSION=0 9 * * *
```

Keep the container running via Docker (Compose already sets `restart: unless-stopped`).

---

## Security & Privacy

- Runs as a **non‑root** user inside the container.
- Only stores a local JSON index (no PII beyond names you choose to ignore).
- You control all secrets via `.env`. Never commit it.
- Apprise targets (SMS, email, etc.) are managed by **your** Apprise server.

---

## Contributing

- Fork ↗ create a branch ↗ run `npm test && npm run lint` ↗ open a PR.
- Keep functions small and pure. Prefer **explicit** params and returns.
- Write/extend tests in `test/` when changing behavior.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the style guide.

---

## Troubleshooting

- **No notifications?** Check the Apprise API logs and verify `APPRISE_KEY` or `APPRISE_URLS` configuration.
- **Index feels stale?** Lower `PHOTOS_INDEX_TTL_SECONDS` or delete the file at `PHOTOS_INDEX_PATH` to force a rebuild.
- **TLS issues to NAS?** The HTTP client supports an “insecure” mode — but prefer fixing certificates.

---

## License

This project is licensed under the [MIT License](./LICENSE).
