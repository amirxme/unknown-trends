# UNKNOWN TRENDS

Global trend intelligence product. UNKNOWN currently collects live Google Trends RSS signals across ten regions and ranks them by coverage, volume and regional position.

## Data pipeline

```text
Google Trends RSS
  -> source adapter / Unicode title normalization
  -> unique regional aggregation
  -> Global Score + historical dynamics
  -> Neon/Postgres snapshots (scheduled capture only)
  -> read-only API
  -> frontend
```

Current source regions: US, GB, DE, FR, JP, KR, IN, BR, CA and AU.

Global Score weights:

- Coverage: 50%
- Volume: 30%
- Position: 20%

Momentum, growth, velocity, acceleration and confidence are only returned when historical snapshots exist. New signals are marked `NEW` and show that historical data is being collected.

## Local commands

```bash
npm install
npm test
npm run build
```

## Environment variables

- `DATABASE_URL` — Neon/Postgres connection string. Without it, live trends still load but history cannot be persisted.
- `CRON_SECRET` — required in production for `/api/capture`. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`.

## Endpoints

- `GET /api/trends` — read-only live trend response.
- `GET /api/history?title=<title>` — historical snapshots for a signal.
- `GET|POST /api/capture` — scheduled collector; requires `CRON_SECRET` in production.

The frontend does not use demo/fallback trend data in production. If the API is unavailable, it displays an honest data-unavailable state.
