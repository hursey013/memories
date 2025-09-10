# Memories — “On This Day” from Synology Photos → your phone (via Apprise)

Memories picks a photo or video taken **on this day in past years** from your Synology Photos library and sends it to you through **Apprise** (SMS/MMS, Push, Email, Discord, etc.). Wake up to a little nostalgia ☕📸

---

## What you need

- A Synology NAS with **DSM** and **Synology Photos** enabled.
- **Container Manager** (Docker) on your NAS.
- Either:
  - An existing **Apprise API** server you can point to, **or**
  - Run Apprise API alongside Memories, **or**
  - Skip a server entirely and send directly with **`APPRISE_URLS`**.

---

## Quick setup

### 1) Create a Synology user for Memories (optional but recommended)

- DSM → **Control Panel → User & Group** → add a user like `memories`.
- Give it **read-only** access to the shared folders where your Photos live.

### 2) Open Container Manager → Project → Create

When prompted, choose **Create using docker‑compose**, then copy and paste one of the examples below directly into the editor. Adjust the values for your environment, then click **Next** to deploy.

---

<details open>

<summary>Option A — You already run Apprise API</summary>

```yaml
services:
  memories:
    image: ghcr.io/hursey013/memories:latest
    container_name: memories
    restart: unless-stopped
    environment:
      # --- Synology connection ---
      NAS_IP: "your-nas-host-or-ip"
      USER_ID: "memories" # your Synology username
      USER_PASSWORD: "supersecret"
      FOTO_TEAM: "false" # set "true" if you use Team folders

      # --- Behavior & filtering ---
      IGNORED_PEOPLE: "" # e.g. "Test Person,Someone"

      # --- Scheduling (omit to run once and exit) ---
      CRON_EXPRESSION: "0 9 * * *" # every day 9:00 AM

      # --- Apprise (existing server) ---
      APPRISE_URL: "http://your-apprise-api:8000"
      APPRISE_KEY: "" # if your Apprise API uses a key
      # OR stateless direct URLs (skip APPRISE_URL if using this):
      # APPRISE_URLS: "discord://webhook_id/webhook_token,mailto://to@example.com?from=me@example.com"

      # --- Networking robustness (optional) ---
      HTTP_TIMEOUT_MS: "10000"
      HTTP_RETRIES: "2"

      # --- Timezone ---
      TZ: "America/New_York"
    volumes:
      - ./cache:/app/cache
```

</details>

<details>

<summary>## Option B — You don’t run Apprise yet (bundle it with Memories)</summary>

```yaml
services:
  apprise-api:
    image: lscr.io/linuxserver/apprise-api:latest
    container_name: memories-apprise-api
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
    container_name: memories
    depends_on:
      - apprise-api
    restart: unless-stopped
    environment:
      # --- Synology connection ---
      NAS_IP: "your-nas-host-or-ip"
      USER_ID: "memories"
      USER_PASSWORD: "supersecret"
      FOTO_TEAM: "false"

      # --- Behavior & filtering ---
      IGNORED_PEOPLE: ""

      # --- Scheduling ---
      CRON_EXPRESSION: "0 9 * * *"

      # --- Apprise (bundled) ---
      APPRISE_URL: "http://memories-apprise-api:8000"
      APPRISE_KEY: ""

      # --- Networking ---
      HTTP_TIMEOUT_MS: "10000"
      HTTP_RETRIES: "2"

      # --- Timezone ---
      TZ: "America/New_York"
    volumes:
      - ./cache:/app/cache
```

</details>

<details>

<summary>## Option C — No Apprise server (stateless): use `APPRISE_URLS`</summary>

This mode sends directly to one or more Apprise destinations without running Apprise API.

```yaml
services:
  memories:
    image: ghcr.io/hursey013/memories:latest
    container_name: memories
    restart: unless-stopped
    environment:
      # --- Synology connection ---
      NAS_IP: "your-nas-host-or-ip"
      USER_ID: "memories"
      USER_PASSWORD: "supersecret"
      FOTO_TEAM: "false"

      # --- Behavior & filtering ---
      IGNORED_PEOPLE: ""

      # --- Scheduling (omit to run once) ---
      CRON_EXPRESSION: "0 9 * * *"

      # --- Apprise (stateless direct URLs) ---
      # Use a comma-separated list of Apprise URLs:
      APPRISE_URLS: "mailto://to@example.com?from=me@example.com,discord://webhook_id/webhook_token,pushover://user@token"

      # --- Networking ---
      HTTP_TIMEOUT_MS: "10000"
      HTTP_RETRIES: "2"

      # --- Timezone ---
      TZ: "America/New_York"
    volumes:
      - ./cache:/app/cache
```

### Examples for `APPRISE_URLS`

- **Email (SMTP via local MTA):**
  ```
  mailto://you@example.com?from=memories@example.com
  ```
- **Discord (webhook):**
  ```
  discord://WEBHOOK_ID/WEBHOOK_TOKEN
  ```
- **Pushover:**
  ```
  pushover://USER_KEY@APP_TOKEN
  ```
- **Gotify:**
  ```
  gotify://gotify.example.com/TOKEN
  ```
- **Telegram (bot):**
  ```
  tgram://BOT_TOKEN/CHAT_ID
  ```
- **Twilio SMS (if enabled in your Apprise build):**
  ```
  twilio://ACCOUNT_SID:AUTH_TOKEN@+15551234567/+15557654321
  ```

> Tip: Start with one destination, check logs, then append more. Keep the entire list on one line, separated by commas.

</details>

## Deploy

1. In **DSM → Container Manager → Project → Create**, choose **Create using docker‑compose**.
2. Paste one of the examples above into the editor, edit the values for your NAS, and click **Next**.
3. For Option B, open `http://<NAS>:8000/` to verify Apprise API is up (optional), then test Memories.

That’s it! Each run picks a “this day in history” item from your Synology Photos and sends it via Apprise.

---

## Tips & FAQs

- **Schedule or run once?** Set `CRON_EXPRESSION` to a cron string to run daily. If you leave it blank, Memories runs once and exits.
- **Where does it store data?** In the `./cache` folder mounted on your NAS (JSON index + small bookkeeping). Safe to delete if you want to force a rebuild.
- **How do I target multiple destinations?** Use Option C’s `APPRISE_URLS` with a comma‑separated list, or run Apprise API (Options A/B) and manage targets there.
- **Stuck?** Check container logs in **Container Manager → Containers → memories → Logs** for helpful messages.
