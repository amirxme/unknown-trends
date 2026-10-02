const regions = [
  { code: "US", name: "United States", hl: "en-US", gl: "US" },
  { code: "GB", name: "United Kingdom", hl: "en-GB", gl: "GB" },
  { code: "DE", name: "Germany", hl: "de-DE", gl: "DE" },
  { code: "FR", name: "France", hl: "fr-FR", gl: "FR" },
  { code: "JP", name: "Japan", hl: "ja-JP", gl: "JP" },
  { code: "KR", name: "South Korea", hl: "ko-KR", gl: "KR" },
  { code: "IN", name: "India", hl: "en-IN", gl: "IN" },
  { code: "BR", name: "Brazil", hl: "pt-BR", gl: "BR" },
  { code: "CA", name: "Canada", hl: "en-CA", gl: "CA" },
  { code: "AU", name: "Australia", hl: "en-AU", gl: "AU" }
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function cleanText(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function parseRssItems(xml, region) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const trafficMatch = itemXml.match(
      /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i
    );
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descriptionMatch = itemXml.match(
      /<description>([\s\S]*?)<\/description>/i
    );

    const title = cleanText(titleMatch?.[1]);

    if (!title) {
      continue;
    }

    const trafficText = cleanText(trafficMatch?.[1] || "0");
    const trafficNumber = parseInt(
      trafficText.replace(/[^0-9]/g, ""),
      10
    );

    const description = cleanText(descriptionMatch?.[1]);

    items.push({
      title,
      titleKey: title.toLowerCase().trim(),
      traffic: Number.isFinite(trafficNumber) ? trafficNumber : 0,
      region: region.code,
      regionName: region.name,
      publishedAt: cleanText(pubDateMatch?.[1])
    });
  }

  return items;
}

function calculateCoverage(regionsCount) {
  return Math.min(100, Math.round((regionsCount / regions.length) * 100));
}

function calculateVolumeScore(trafficValues) {
  if (!trafficValues.length) {
    return 0;
  }

  const maxTraffic = Math.max(...trafficValues);

  if (!maxTraffic) {
    return 0;
  }

  const average =
    trafficValues.reduce((sum, value) => sum + value, 0) /
    trafficValues.length;

  return Math.min(
    100,
    Math.round((average / maxTraffic) * 100)
  );
}

function calculatePositionScore(positions) {
  if (!positions.length) {
    return 0;
  }

  const scores = positions.map((position) => {
    if (position === 1) return 100;
    if (position === 2) return 90;
    if (position === 3) return 80;
    if (position === 4) return 70;
    if (position === 5) return 60;
    if (position <= 10) return 50;

    return 30;
  });

  return Math.round(
    scores.reduce((sum, value) => sum + value, 0) /
      scores.length
  );
}

function calculateGlobalScore({
  coverageScore,
  volumeScore,
  positionScore
}) {
  return Math.round(
    coverageScore * 0.5 +
      volumeScore * 0.3 +
      positionScore * 0.2
  );
}

function calculateMomentumScore(globalScore, previousScore) {
  if (previousScore === null || previousScore === undefined) {
    return Math.round(globalScore * 0.7);
  }

  const change = globalScore - previousScore;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(50 + change * 3)
    )
  );
}

function calculateConfidenceScore(historyCount, signalStability) {
  const historyScore = Math.min(
    100,
    historyCount * 20
  );

  const stabilityScore = Math.max(
    0,
    Math.min(100, signalStability)
  );

  return Math.round(
    historyScore * 0.5 +
      stabilityScore * 0.5
  );
}

function calculateDynamics(currentScore, previousScore, olderScore) {
  if (previousScore === null || previousScore === undefined) {
    return {
      momentum: 0,
      velocity: 0,
      acceleration: 0
    };
  }

  const momentum = currentScore - previousScore;

  let velocity = momentum;
  let acceleration = 0;

  if (
    olderScore !== null &&
    olderScore !== undefined
  ) {
    const previousVelocity = previousScore - olderScore;

    velocity = previousVelocity;
    acceleration = momentum - previousVelocity;
  }

  return {
    momentum,
    velocity,
    acceleration
  };
}

function getStatus(globalScore, momentum) {
  if (globalScore >= 80 && momentum > 0) {
    return "BREAKOUT";
  }

  if (globalScore >= 65 && momentum > 0) {
    return "RISING";
  }

  if (momentum > 0) {
    return "EMERGING";
  }

  if (momentum < 0) {
    return "COOLING";
  }

  return "STABLE";
}

function buildDescription({
  title,
  globalScore,
  momentum,
  regionsCount
}) {
  if (momentum > 10) {
    return `${title} is gaining momentum across ${regionsCount} tracked regions.`;
  }

  if (momentum > 0) {
    return `${title} is showing early upward movement across ${regionsCount} tracked regions.`;
  }

  if (momentum < -10) {
    return `${title} is losing momentum across the tracked regions.`;
  }

  return `${title} is currently being observed across ${regionsCount} tracked regions.`;
}

async function loadDatabase() {
  try {
    const db = await import("../lib/db.js");

    await db.ensureTrendSnapshotsTable();

    return db.sql;
  } catch (error) {
    console.error(
      "UNKNOWN database unavailable:",
      error
    );

    return null;
  }
}

export default async function handler(req, res) {
  try {
    const sql = await loadDatabase();

    const regionResults = await Promise.all(
      regions.map(async (region) => {
        try {
          const url =
            `https://trends.google.com/trending/rss` +
            `?geo=${encodeURIComponent(region.gl)}`;

          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; UNKNOWN-Trends/1.0)"
            }
          });

          if (!response.ok) {
            throw new Error(
              `Google Trends returned ${response.status}`
            );
          }

          const xml = await response.text();

          return parseRssItems(xml, region);
        } catch (error) {
          console.error(
            `Google Trends ${region.code} error:`,
            error
          );

          return [];
        }
      })
    );

    const trendMap = new Map();

    for (const regionItems of regionResults) {
      for (const item of regionItems) {
        if (!trendMap.has(item.titleKey)) {
          trendMap.set(item.titleKey, {
            title: item.title,
            titleKey: item.titleKey,
            regions: [],
            traffic: [],
            positions: [],
            descriptions: []
          });
        }

        const trend = trendMap.get(item.titleKey);

        trend.regions.push({
          code: item.region,
          name: item.regionName
        });

        trend.traffic.push(item.traffic);

        trend.positions.push(
          trend.positions.length + 1
        );

        if (item.description) {
          trend.descriptions.push(
            item.description
          );
        }
      }
    }

    const trends = Array.from(
      trendMap.values()
    );

    const titleKeys = trends.map(
      (trend) => trend.titleKey
    );

    let historyRows = [];

    if (sql && titleKeys.length > 0) {
      try {
        historyRows = await sql`
          SELECT
            title_key,
            captured_at,
            global_score
          FROM trend_snapshots
          WHERE title_key = ANY(${titleKeys})
          ORDER BY captured_at DESC
        `;
      } catch (error) {
        console.error(
          "UNKNOWN history query error:",
          error
        );

        historyRows = [];
      }
    }

    const finalTrends = trends
      .map((trend) => {
        const history = historyRows.filter(
          (row) =>
            row.title_key === trend.titleKey
        );

        const previousScore =
          history.length > 0
            ? Number(history[0].global_score)
            : null;

        const olderScore =
          history.length > 1
            ? Number(history[1].global_score)
            : null;

        const coverageScore =
          calculateCoverage(
            trend.regions.length
          );

        const volumeScore =
          calculateVolumeScore(
            trend.traffic
          );

        const positionScore =
          calculatePositionScore(
            trend.positions
          );

        const globalScore =
          calculateGlobalScore({
            coverageScore,
            volumeScore,
            positionScore
          });

        const dynamics =
          calculateDynamics(
            globalScore,
            previousScore,
            olderScore
          );

        const signalStability =
          Math.max(
            0,
            Math.min(
              100,
              100 -
                Math.abs(
                  dynamics.acceleration
                ) *
                  2
            )
          );

        const momentumScore =
          calculateMomentumScore(
            globalScore,
            previousScore
          );

        const confidenceScore =
          calculateConfidenceScore(
            history.length,
            signalStability
          );

        const emergingScore =
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                globalScore * 0.5 +
                  momentumScore * 0.3 +
                  confidenceScore * 0.2
              )
            )
          );

        const status =
          getStatus(
            globalScore,
            dynamics.momentum
          );

        const description =
          buildDescription({
            title: trend.title,
            globalScore,
            momentum:
              dynamics.momentum,
            regionsCount:
              trend.regions.length
          });

        return {
          title: trend.title,
          titleKey: trend.titleKey,

          globalScore,
          momentumScore,
          confidenceScore,
          emergingScore,

          coverageScore,
          volumeScore,
          positionScore,

          momentum: dynamics.momentum,
          velocity: dynamics.velocity,
          acceleration:
            dynamics.acceleration,

          historyCount:
            history.length,

          regions: trend.regions,

          signalBreakdown: {
            coverage: coverageScore,
            volume: volumeScore,
            position: positionScore,
            global: globalScore
          },

          status,
          description
        };
      })
      .sort(
        (a, b) =>
          b.globalScore -
          a.globalScore
      )
      .slice(0, 20);

    if (sql && finalTrends.length > 0) {
      try {
        for (const trend of finalTrends) {
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
              ${String(trend.regions.length)},
              ${JSON.stringify(trend.regions)},
              ${trend.description},
              ${trend.status}
            )
          `;
        }
      } catch (error) {
        console.error(
          "UNKNOWN snapshot save error:",
          error
        );
      }
    }

    return res.status(200).json({
      success: true,
      source: "Google Trends Global",

      scoring: {
        coverage: "50%",
        volume: "30%",
        position: "20%"
      },

      regionsTracked:
        regions.length,

      updatedAt:
        new Date().toISOString(),

      count:
        finalTrends.length,

      trends:
        finalTrends
    });
  } catch (error) {
    console.error(
      "UNKNOWN API error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "DATA UNAVAILABLE"
    });
  }
}