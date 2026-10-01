import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

let tablePromise;

export function ensureTrendSnapshotsTable() {
  if (!tablePromise) {
    tablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS trend_snapshots (
          id BIGSERIAL PRIMARY KEY,
          captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          title_key TEXT NOT NULL,
          title TEXT NOT NULL,
          global_score INTEGER NOT NULL,
          coverage_score INTEGER NOT NULL,
          volume_score INTEGER NOT NULL,
          position_score INTEGER NOT NULL,
          mentions TEXT,
          regions JSONB,
          signal TEXT,
          status TEXT
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS trend_snapshots_title_key_captured_at_idx
        ON trend_snapshots(title_key, captured_at DESC)
      `;
    })();
  }

  return tablePromise;
}

export { sql };