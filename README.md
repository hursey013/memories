# Memories — “On This Day” from Synology Photos

Memories picks a photo taken **on this day in past years** from your Synology Photos library and sends it to you through **Apprise** (SMS/MMS, Push, Email, Discord, etc.). Wake up to a little nostalgia ☕📸

---

## Features

- ✨ **Smart photo weighting** – Prioritizes favorites, faces, and photos with rich EXIF data so the best memories surface first.
- 📸 **Burst smoothing** – Detects rapid-fire shots and picks a single representative image to avoid spammy notifications.
- 📅 **No repeats** – Keeps a per-day history so you don’t see the same photo twice
- 🎉 **Apprise integration** – Sends through Apprise, unlocking SMS, email, Discord, Pushbullet, Matrix, and every other channel Apprise supports.
- 📦 **Docker-friendly** – Ships as a small Node.js container with environment-driven configuration—drop into Synology Container Manager or Compose and go.

---

## What you need

- A Synology NAS with **DSM** and **Synology Photos** enabled.
- **Container Manager** (Docker) on your NAS.
- Either:
  - An existing **Apprise API** server you can point to, **or**
  - Run Apprise API alongside Memories

---

## Quick setup

### 1) Create a Synology user for Memories (optional but recommended)

- DSM → **Control Panel → User & Group** → add a user like `memories`.
- Give it **read-only** access to the shared folders where your Photos live.

### 2) Open Container Manager → Project → Create

When prompted, choose **Create using docker‑compose**, then copy and paste one of the examples below directly into the editor. Adjust the values for your environment, then click **Next** to deploy.

<details open>

<summary><h3>Option A — You already run Apprise API</h3></summary>

```yaml
services:
  memories:
    image: ghcr.io/hursey013/memories:latest
    restart: unless-stopped
    environment:
      # --- Synology connection ---
      NAS_IP: "your-nas-host-or-ip" # Reachable host/IP for Synology Photos (HTTPS)
      USER_ID: "memories" # DSM username with read access to your photos
      USER_PASSWORD: "supersecret" # Password for that DSM account
      FOTO_TEAM: "false" # Set to "true" when using Synology Team folders

      # --- Behavior & filtering ---
      FAVORITE_PEOPLE: "" # Optional comma-separated list to prioritize
      IGNORED_PEOPLE: "" # Optional comma-separated list to skip completely
      MIN_YEAR: "2000" # Ignore photos taken before this year
      YEARS_BACK: "0" # Limit to this many years back (0 = no limit beyond MIN_YEAR)
      DAY_OFFSET: "-1" # Shift the queried calendar day (helps timezones)
      MIN_WEIGHT: "3" # Minimum score a photo must reach to be considered
      INLINE_EMAIL: "false" # Set true to embed photos inline in HTML email

      # --- Scheduling (omit to run once and exit) ---
      CRON_EXPRESSION: "0 9 * * *" # Run every day at 9:00 AM

      # --- Apprise (existing server) ---
      APPRISE_URL: "http://your-apprise-api:8000"
      APPRISE_KEY: "" # Provide if your Apprise API is keyed
      # OR stateless direct URLs (skip APPRISE_URL if using this):
      # APPRISE_URLS: "discord://webhook_id/webhook_token,mailto://to@example.com?from=me@example.com"

      # --- Timezone ---
      TZ: "America/New_York" # Keeps cron/log output aligned with your morning
    volumes:
      - ./cache:/app/cache
```

</details>

<details open>

<summary><h3>Option B — You don’t run Apprise yet (bundle it with Memories)</h3></summary>

```yaml
services:
  apprise-api:
    image: lscr.io/linuxserver/apprise-api:latest
    environment:
      PUID: "1026" # adjust to your DSM user/group if needed
      PGID: "100"
      TZ: "America/New_York"
    volumes:
      - ./apprise-config:/config
      - ./apprise-attachments:/attachments
    ports:
      - "8000:8000"
    restart: unless-stopped

  memories:
    image: ghcr.io/hursey013/memories:latest
    depends_on:
      - apprise-api
    restart: unless-stopped
    environment:
      # --- Synology connection ---
      NAS_IP: "your-nas-host-or-ip" # Reachable host/IP for Synology Photos (HTTPS)
      USER_ID: "memories" # DSM username with read access to your photos
      USER_PASSWORD: "supersecret" # Password for that DSM account
      FOTO_TEAM: "false" # Set to "true" when using Synology Team folders

      # --- Behavior & filtering ---
      FAVORITE_PEOPLE: "" # Optional comma-separated list to prioritize
      IGNORED_PEOPLE: "" # Optional comma-separated list to skip completely
      MIN_YEAR: "2000" # Ignore photos taken before this year
      YEARS_BACK: "0" # Limit to this many years back (0 = no limit beyond MIN_YEAR)
      DAY_OFFSET: "-1" # Shift the queried calendar day (helps timezones)
      MIN_WEIGHT: "3" # Minimum score a photo must reach to be considered
      INLINE_EMAIL: "false" # Set true to embed photos inline in HTML email

      # --- Scheduling (omit to run once and exit) ---
      CRON_EXPRESSION: "0 9 * * *" # Run every day at 9:00 AM

      # --- Apprise (bundled server) ---
      APPRISE_URL: "http://apprise-api:8000"
      APPRISE_KEY: ""
      # OR stateless direct URLs (skip APPRISE_URL if using this):
      # APPRISE_URLS: "discord://webhook_id/webhook_token,mailto://to@example.com?from=me@example.com"

      # --- Timezone ---
      TZ: "America/New_York"
    volumes:
      - ./cache:/app/cache
```

</details>

That’s it! Each run picks a “this day in history” item from your Synology Photos and sends it via Apprise.

---

## How photo scoring works

Every photo gets a “nostalgia score.” Higher numbers win, and anything below your `MIN_WEIGHT` value is skipped. Here’s the cheat sheet:

| Signal                          | Score impact         |
| ------------------------------- | -------------------- |
| Favorites (your “VIPs”)         | +5 each (cap +10)    |
| Named people (user curated)     | +2 each (cap +8)     |
| Face count                      | +1 per face (cap +4) |
| Unnamed faces                   | −1 each (cap −3)     |
| EXIF present / camera model     | +1 / +3              |
| No EXIF metadata at all         | −4                   |
| Date nostalgia: 3–10 years old  | +2                   |
| Date nostalgia: 10–20 years old | +1                   |
| Tie-breaker jitter              | +0 to +0.25          |

---

## New to Apprise?

It’s an open-source notification router that can fan out a message to over 90 services—SMS gateways, email, Slack, Pushbullet, Discord, Matrix, you name it. Memories just needs the Apprise API to be running somewhere it can reach.

1. **Spin up the API.** Easiest path: use the bundled compose example above. The container listens on port 8000 by default.
2. **Decide on auth.**
   - _Stateful mode_ (recommended): add a Key inside the Apprise web UI and provide it via `APPRISE_KEY`. This keeps your targets hidden server-side.
   - _Stateless mode:_ skip the key and provide one or more target URLs in `APPRISE_URLS` (comma-separated), e.g. `discord://webhook/token,mailto://me@example.com`.
3. **Add services.** Browse the [Apprise notification support matrix](https://github.com/caronc/apprise/wiki) to copy the right URL format for each service you want (Discord, Telegram, Pushover, etc.). If you’re using stateful mode, add these targets in the Apprise UI. For stateless mode, paste them directly into `APPRISE_URLS`.
4. **Prefer email inline?** Set `INLINE_EMAIL=true`. Memories will fetch the photo, base64-embed it in an HTML `<img>` tag, and send the message as full HTML so the picture renders inline even if your mail server can’t reach Synology directly.
5. **Test it.** Hit your Apprise API’s `/notify` endpoint manually or run `curl` with a simple payload to confirm you get pinged. Once that works, Memories will reuse the same setup each morning.

Need more detail? The Apprise docs include step-by-step guides for every integration and a handy command-line utility for testing locally: [https://github.com/caronc/apprise](https://github.com/caronc/apprise)

---

## Tips & FAQs

- **Schedule or run once?** Leave `CRON_EXPRESSION` blank to run a single time. Add a cron string (like `0 8 * * *`) to send a hello every morning.
- **Where is the cache?** Under the mounted `./cache` directory. You can safely delete it if you want to re-send older favorites; the app will rebuild it.
- **Seeing tomorrow’s photo?** Set `DAY_OFFSET=-1` to nudge the query back a day.
- **Need to tweak people filters?** Update `FAVORITE_PEOPLE` and `IGNORED_PEOPLE`, then restart the stack—the new weights apply immediately.
- **Logs & troubleshooting.** Container Manager → **Containers → memories → Logs** will show friendly status messages and errors if Synology or Apprise push back.

## Developer guide

- **Install dependencies:** `npm ci`
- **Run the test suite:** `npm test`
- **Watch tests:** `npm run test:watch`
- **Lint / format:** `npm run lint`, `npm run lint:fix`, `npm run format`

### Testing strategy

- `test/weight.test.js` keeps the nostalgia heuristics honest (favorites, ignored people, minimum weight, EXIF bonuses).
- `test/sent.test.js` validates per-day cache helpers and shard cleanup.
- `test/burst.test.js` covers burst grouping and representative selection.
- `test/apprise.test.js` ensures HTML email formatting escapes content and falls back safely.
- `test/synology.test.js` validates time-range construction and thumbnail URL generation.
- `test/runOnce.integration.test.js` keeps end-to-end orchestration in check with mocked services.
- `test/utils.test.js` protects helper behavior such as `photoUID` and `calculateYearsAgo`.

GitHub Actions runs `npm test` on every push and pull request. When the tests pass on `main`, the same workflow builds the container, runs the suite inside it, and then publishes the Docker image to GHCR.

## Credits & Inspiration

This project was inspired by [treyg/synology-photos-memories](https://github.com/treyg/synology-photos-memories) and also benefits from the excellent work documenting Synology’s unofficial API by [zeichensatz/SynologyPhotosAPI](https://github.com/zeichensatz/SynologyPhotosAPI).
