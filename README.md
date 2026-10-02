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

## Future integration boundary

UNKNOWN TRENDS is intended to become the intelligence layer for the future UNKNOWN ecosystem, including a possible UNKNOWN memecoin, account layer, holder utility and wallet-aware experiences. This is an architectural direction only; the current product does **not** create a token, connect wallets, process transactions or expose crypto mechanics.

Until a separate integration brief is approved, development should preserve these boundaries:

- Keep trend signals and historical snapshots addressable by stable, domain-level identifiers rather than presentation-only strings.
- Keep data collection, scoring, API responses and frontend presentation separated so future account or entitlement layers can be added without rewriting the signal engine.
- Treat future user accounts, wallets, holder status and token utility as optional adapters around the core product, not as dependencies of live trend analysis.
- Do not add wallet login, token balances, holder gating, token rewards, trading, payments or blockchain writes without an explicit product and security specification.
- Prioritize a useful, trustworthy and complete UNKNOWN TRENDS product first; future ecosystem integration must not reduce signal quality or make core research require crypto access.
