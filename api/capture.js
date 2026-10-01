import { sql, ensureTrendSnapshotsTable } from "../lib/db.js";

const REGIONS = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title) {
  return cleanText(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function parseTraffic(value) {
  const text = cleanText(value).toUpperCase();

  if (!text) return 0;

  const match = text.match(/([\d,.]+)\s*([KMB])?/);

  if (!match) return 0;

  const number = parseFloat(match[1].replace(/,/g, ""));

  if (!Number.isFinite(number)) return 0;

  const multiplier =
    match[2] === "K"
      ? 1000
      : match[2] === "M"
        ? 1000000
        : match[2] === "B"
          ? 1000000000
          : 1;

  return Math.round(number * multiplier);
}

function trafficScore(traffic) {
  if (traffic >= 1000000) return 100;
  if (traffic >= 500000) return 90;
  if (traffic >= 200000) return 80;
  if (traffic >= 100000) return 70;
  if (traffic >= 50000) return 60;
  if (traffic >= 20000) return 50;
  if (traffic >= 10000) return 40;
  if (traffic >= 5000) return 30;
  if (traffic >= 1000) return 20;
  return 10;
}

function rankScore(rank) {
  return Math.max(10, 100 - (rank - 1) * 5);
}

async function fetchRegion(region) {
  const url = `https://trends.google.com/trending/rss?geo=${region.code}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Trends returned ${response.status} for ${region.code}`);
  }

  const xml = await response.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items.slice(0, 20).map((match, index) => {
    const item = match[1];

    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const trafficMatch = item.match(
      /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/
    );

    const title = cleanText(
      titleMatch?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
    );

    const traffic = cleanText(
      trafficMatch?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    );

    return {
      title,
      titleKey: normalizeTitle(title),
      traffic,
      trafficNumber: parseTraffic(traffic),
      rank: index + 1,
      region: region.name
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    await ensureTrendSnapshotsTable();

    const results = await Promise.allSettled(
      REGIONS.map((region) => fetchRegion(region))
    );

    const trendMap = new Map();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      for (const item of result.value) {
        if (!item.titleKey) continue;

        if (!trendMap.has(item.titleKey)) {
          trendMap.set(item.titleKey, {
            title: item.title,
            titleKey: item.titleKey,
            regions: [],
            bestRank: item.rank,
            maxTraffic: item.trafficNumber,
            mentions: item.traffic
          });
        }

        const trend = trendMap.get(item.titleKey);

        if (!trend.regions.includes(item.region)) {
          trend.regions.push(item.region);
        }

        trend.bestRank = Math.min(trend.bestRank, item.rank);
        trend.maxTraffic = Math.max(trend.maxTraffic, item.trafficNumber);

        if (item.trafficNumber > parseTraffic(trend.mentions)) {
          trend.mentions = item.traffic;
        }
      }
    }

    const trends = [...trendMap.values()]
      .map((trend) => {
        const coverageScore = Math.min(
          100,
          Math.round((trend.regions.length / REGIONS.length) * 100)
        );

        const volumeScore = trafficScore(trend.maxTraffic);
        const positionScore = rankScore(trend.bestRank);

        const globalScore = Math.round(
          coverageScore * 0.5 +
          volumeScore * 0.3 +
          positionScore * 0.2
        );

        const signal =
          globalScore >= 85
            ? "VERY HIGH"
            : globalScore >= 70
              ? "HIGH"
              : "MEDIUM";

        const status =
          globalScore >= 75
            ? "ACCELERATING"
            : globalScore >= 55
              ? "RISING"
              : "EMERGING";

        return {
          ...trend,
          globalScore,
          coverageScore,
          volumeScore,
          positionScore,
          signal,
          status
        };
      })
      .sort((a, b) => b.globalScore - a.globalScore)
      .slice(0, 20);

    for (const trend of trends) {
      await sql`
        INSERT INTO trend_snapshots (
          title_key,
          title,
          global_score,
          coverage_score,
          volume_score,
          position_score,
          mentions,
          regions,
          signal,
          status
        )
        VALUES (
          ${trend.titleKey},
          ${trend.title},
          ${trend.globalScore},
          ${trend.coverageScore},
          ${trend.volumeScore},
          ${trend.positionScore},
          ${trend.mentions},
          ${JSON.stringify(trend.regions)},
          ${trend.signal},
          ${trend.status}
        )
      `;
    }

    return res.status(200).json({
      success: true,
      saved: trends.length,
      capturedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Capture error:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}