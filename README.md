# memories-mailer

A small Node project that logs into Synology Photos, chooses a photo taken on this same month/day in a prior year, and emails it as an inline image.

## Quick start

```bash
cp .env.example .env
# fill in values

npm ci
npm start
```

To enable scheduling, set `CRON_EXPRESSION` in `.env` (e.g., `0 8 * * *`) and run `npm start`.

## Tests
```bash
npm test
```
