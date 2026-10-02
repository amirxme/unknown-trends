import { sql, ensureTrendSnapshotsTable } from "../lib/db.js";
import { collectScoredTrends } from "../lib/trends/collector.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    await ensureTrendSnapshotsTable();
    const result = await collectScoredTrends(sql);

    return res.status(200).json({
      success: true,
      source: "Google Trends Global",
      scoring: { coverage: "50%", volume: "30%", position: "20%" },
      regionsTracked: result.regionsTracked,
      regionsSucceeded: result.regionsSucceeded,
      failedRegions: result.failedRegions,
      updatedAt: new Date().toISOString(),
      count: result.trends.length,
      trends: result.trends
    });
  } catch (error) {
    console.error("UNKNOWN trends API error:", error);
    return res.status(503).json({ success: false, error: "DATA UNAVAILABLE" });
  }
}
