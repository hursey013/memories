# memories

This project logs into **Synology Photos**, selects a random photo taken on **today’s month/day** from a **prior year**, and delivers a notification via **Apprise**.

This update focuses on **organization**, **naming**, **docs**, **tests**, and **robustness**.

## What’s improved
- **Config parsing**: centralized and validated; numeric envs parsed safely.
- **HTTP hardening**: timeouts + optional retries; insecure TLS scope kept minimal.
- **Index builder**: extracted + tested month/day bucketing logic.
- **Apprise client**: supports binary attachments (more reliable than URL fetches).
- **Docs**: complete env reference; dev workflow with `node --watch`.
- **Tests**: cache TTL expiry + index bucketing tests.

## Env variables (reference)

| Name | Description | Default |
|---|---|---|
| `NAS_IP` | Synology IP/host | — |
| `USER_ID` / `USER_PASSWORD` | Synology credentials | — |
| `FOTO_TEAM` | `"true"` for `FotoTeam` | `false` |
| `THUMBNAIL_SIZE` | Synology size `s/m/l/xl` | `l` |
| `APPRISE_URL` | Apprise API base URL | `http://localhost:8000` |
| `APPRISE_KEY` | Stateful key for `/notify/{KEY}` | — |
| `APPRISE_URLS` | Stateless targets if no key | — |
| `PHOTOS_INDEX_PATH` | Cache file path | `./cache/photos-index.json` |
| `PHOTOS_INDEX_TTL_SECONDS` | Cache TTL seconds | `604800` |
| `HTTP_TIMEOUT_MS` | Timeout per HTTP call | `15000` |
| `HTTP_RETRIES` | Retries for Synology JSON calls | `1` |
| `CRON_EXPRESSION` | Cron schedule or empty to run once | — |
| `FORCE_REFRESH` | `1` to invalidate cache this run | — |

## Development
- Run locally:
  ```bash
  npm ci
  npm run dev   # Node --watch
  ```

- Docker dev (Container Manager / Compose):
  - `Dockerfile.dev` + `docker-compose.dev.yml` bind-mount `src/` and run `node --watch`.

## Notes
- If your NAS uses a self-signed cert, we scope TLS relaxation per call (no global side effects).
- Sending the **image bytes** to Apprise avoids “Bad attachment” from URL fetch failures.
