# Memories — “On This Day” from Synology Photos

Memories picks a photo taken **on this day in past years** from your Synology Photos library and sends it to you through **Apprise** (SMS/MMS, Push, Email, Discord, etc.). Wake up to a little nostalgia ☕📸

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
      NAS_IP: "your-nas-host-or-ip"
      USER_ID: "memories" # your Synology username
      USER_PASSWORD: "supersecret"
      FOTO_TEAM: "false" # set "true" if you use Team folders

      # --- Behavior & filtering ---
      FAVORITE_PEOPLE: "" # e.g. "Test Person,Someone"
      IGNORED_PEOPLE: ""
      MIN_YEAR: "2000" # Ignore photos taken before this year (still respects YEARS_BACK)
      YEARS_BACK: "0" # Limit to this many years back (0 = no limit beyond MIN_YEAR)
      DAY_OFFSET: "0" # Shift the queried calendar day (useful if Synology returns +1 day)
      MIN_WEIGHT: "0" # Drop any photo whose computed weight is below this number

      # --- Scheduling (omit to run once and exit) ---
      CRON_EXPRESSION: "0 9 * * *" # every day 9:00 AM

      # --- Apprise (existing server) ---
      APPRISE_URL: "http://your-apprise-api:8000"
      APPRISE_KEY: "" # if your Apprise API uses a key
      # OR stateless direct URLs (skip APPRISE_URL if using this):
      # APPRISE_URLS: "discord://webhook_id/webhook_token,mailto://to@example.com?from=me@example.com"

      # --- Timezone ---
      TZ: "America/New_York"
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
      NAS_IP: "your-nas-host-or-ip"
      USER_ID: "memories" # your Synology username
      USER_PASSWORD: "supersecret"
      FOTO_TEAM: "false" # set "true" if you use Team folders

      # --- Behavior & filtering ---
      FAVORITE_PEOPLE: "" # e.g. "Test Person,Someone"
      IGNORED_PEOPLE: ""
      MIN_YEAR: "2000" # Ignore photos taken before this year (still respects YEARS_BACK)
      YEARS_BACK: "0" # Limit to this many years back (0 = no limit beyond MIN_YEAR)
      DAY_OFFSET_DAYS: "0" # Shift the queried calendar day (useful if Synology returns +1 day)
      MIN_WEIGHT: "0" # Drop any photo whose computed weight is below this number

      # --- Scheduling (omit to run once and exit) ---
      CRON_EXPRESSION: "0 9 * * *" # every day 9:00 AM

      # --- Apprise (existing server) ---
      APPRISE_URL: "http://your-apprise-api:8000"
      APPRISE_KEY: "" # if your Apprise API uses a key
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

## Tips & FAQs

- **Schedule or run once?** Set `CRON_EXPRESSION` to a cron string to run daily. If you leave it blank, Memories runs once and exits.
- **Where does it store data?** In the `./cache` folder mounted on your NAS (JSON index to keep track of previouslhy sent photos in order to avoid repeats). Safe to delete if you want to force a rebuild.
- **Stuck?** Check container logs in **Container Manager → Containers → memories → Logs** for helpful messages.

## Credits & Inspiration

This project was inspired by [treyg/synology-photos-memories](https://github.com/treyg/synology-photos-memories) and also benefits from the excellent work documenting Synology’s unofficial API by [zeichensatz/SynologyPhotosAPI](https://github.com/zeichensatz/SynologyPhotosAPI).
