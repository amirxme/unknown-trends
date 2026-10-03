import { sql, ensureTrendSnapshotsTable } from "../lib/db.js";
import { collapseSnapshots } from "../lib/trends/collector.js";
import { normalizeTitleKey } from "../lib/trends/source-google.js";

export default async function handler(req, res) {
  try {
    const title = String(req.query?.title || "").trim();
    if (!title) return res.status(400).json({ success: false, error: "Missing title" });

    const titleKey = normalizeTitleKey(title);
    if (!titleKey) return res.status(400).json({ success: false, error: "Invalid title" });

    await ensureTrendSnapshotsTable();
    if (!sql) {
      return res.status(200).json({ success: true, title, count: 0, history: [] });
    }

    const rows = await sql`
      SELECT captured_at, title, global_score, coverage_score, volume_score, position_score, signal, status
      FROM trend_snapshots
      WHERE title_key = ${titleKey}
      ORDER BY captured_at ASC
      LIMIT 100
    `;

    const history = collapseSnapshots(rows).sort(
      (a, b) => new Date(a.captured_at) - new Date(b.captured_at)
    );

    return res.status(200).json({ success: true, title, count: history.length, history });
  } catch (error) {
    console.error("UNKNOWN history API error:", error);
    return res.status(503).json({ success: false, error: "HISTORY UNAVAILABLE" });
  }
}
