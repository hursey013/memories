# ✨ Memories: Synology → PocketBase → Apprise

Send yourself a random **on-this-day** photo from your Synology Photos library — on a human-ish schedule — with **no repeats** until you’ve cycled through that day’s set. Built for self-hosters.

## What you get

- 🔌 **Synology Photos** integration (self-signed TLS friendly)
- 🗂️ **PocketBase** tracks what’s been sent (`photo_uid` per `MM-DD` bucket)
- 📣 **Apprise API** sends SMS/MMS/Push via 100+ providers
- ⏰ **Randomized timing** (or cron) so it feels organic
- 🧪 **Tests & linting** ready to go (Vitest, ESLint, Prettier)
- 🐳 **One Compose stack**: Node app + PocketBase + Apprise API

---

## Quick start (Docker Compose)

1. Copy `.env.example` → `.env` and edit the values.
2. Bring up the stack:
   ```bash
   docker compose up -d
   ```
3. First run:
   - PocketBase Admin → `http://localhost:8090/_/` → create admin.
   - Create collection `sent_photos` with fields:
     - `photo_uid` (text, required, **unique**)
     - `bucket` (text) — e.g., `07-14`
     - `taken_at` (number) — unix seconds (optional)
     - `sent_at` (date) — when sent (optional)

> On Synology, map ports as needed or use DSM Reverse Proxy for HTTPS.

### Scheduling

- **Randomized (default)**: controlled by the `RANDOM_*` envs (Poisson-thinned ticks).
- **Cron**: set `RANDOM_ENABLED=false` and add `CRON_EXPRESSION` (example: `0 8 * * *`). For testing every 2 minutes: `*/2 * * * *`.

---

## How it works

```
Synology Photos --list/thumbnail--> Node app --(URL attachment)--> Apprise API --> SMS/MMS/Push
       |                                                    |
       '------ store sent photo_uids per MM-DD in PocketBase'
```

- Each day’s photos (by month/day) are sent **without repeats**. When a day’s pool is exhausted, we **reset that day’s bucket** and start over.
- Attachments are sent to Apprise as **URLs** (no file uploads), keeping things simple and broadly compatible.

---

## Development

```bash
npm i
npm test
npm run dev   # node --watch
```

Lint/format:

```bash
npm run lint
npm run format
```

### Dev Compose (hot reload)

`compose.yaml` runs the app with `Dockerfile.dev` and bind-mounts `src/`. Use this for local iteration.

---

## Configuration (env)

See `.env.example` for all variables. Highlights:

- **Synology**: `NAS_IP`, `USER_ID`, `USER_PASSWORD`, `FOTO_TEAM` (use `true` for FotoTeam endpoints)
- **PocketBase**: set `PB_URL`, `PB_ADMIN_EMAIL/PASSWORD`, `PB_COLLECTION`
- **Apprise**: use **stateful** mode with `APPRISE_KEY`, or **stateless** with `APPRISE_URLS`
- **Cache TTL**: `PHOTOS_INDEX_TTL_SECONDS` (default 7 days)
- **Randomized timing**: `DAILY_RATE`, `MIN_GAP_MIN`, `MAX_PER_DAY`, `QUIET_START/END`, etc.

---

## Contributing

PRs welcome! Please run `npm test` and `npm run lint` before submitting.

Licensed under **MIT** — see [LICENSE](./LICENSE).
