import { sql, ensureTrendSnapshotsTable } from "../lib/db.js";
import { collectScoredTrends, persistSnapshots } from "../lib/trends/collector.js";

function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const authorization = req.headers?.authorization || "";
  return authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    await ensureTrendSnapshotsTable();
    if (!sql) throw new Error("Database is not configured");

    const result = await collectScoredTrends(sql);
    const saved = await persistSnapshots(sql, result.trends);

    return res.status(200).json({
      success: true,
      saved,
      regionsTracked: result.regionsTracked,
      regionsSucceeded: result.regionsSucceeded,
      failedRegions: result.failedRegions,
      capturedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("UNKNOWN capture error:", error);
    return res.status(503).json({ success: false, error: "CAPTURE FAILED" });
  }
}
