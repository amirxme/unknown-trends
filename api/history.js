import { sql } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const title = req.query?.title;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Missing title"
      });
    }

    const rows = await sql`
      SELECT
        captured_at,
        title,
        global_score,
        coverage_score,
        volume_score,
        position_score,
        signal,
        status
      FROM trend_snapshots
      WHERE title_key = LOWER(TRIM(${title}))
      ORDER BY captured_at ASC
      LIMIT 100
    `;

    return res.status(200).json({
      success: true,
      title,
      count: rows.length,
      history: rows
    });
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}