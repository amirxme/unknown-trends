import { sql } from "../lib/db.js";

const regions = [
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

const aliases = {
  japon: "japan",
  japonia: "japan",
  japao: "japan",

  "日本": "japan",
  "対": "vs",

  "일본": "japan",
  "대": "vs",

  "エクアドル": "ecuador",
  "에콰도르": "ecuador",

  x: "vs",
  equador: "ecuador",

  alemania: "germany",
  deutschland: "germany",

  francia: "france",

  reino: "kingdom",
  unido: "united",
  uk: "united",
  england: "united",

  brasil: "brazil",

  canada: "canada",

  corea: "korea",
  sur: "south",

  estados: "united",
  unidos: "united",

  ecuador: "ecuador",
  equateur: "ecuador"
};

const phraseAliases = {
  "ecuador vs japon": "ecuador japan",
  "japan vs ecuador": "ecuador japan",

  "日本 対 エクアドル": "ecuador japan",
  "エクアドル 対 日本": "ecuador japan",

  "일본 대 에콰도르": "ecuador japan",
  "에콰도르 대 일본": "ecuador japan",

  "japao x equador": "ecuador japan",
  "equador x japao": "ecuador japan"
};

function cleanText(value) {
  return (
    value
      ?.replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim() || ""
  );
}

function normalizeTitle(title) {
  const original = String(title || "").trim();
  const lowerOriginal = original.toLowerCase();

  const hasEcuador =
    lowerOriginal.includes("ecuador") ||
    lowerOriginal.includes("equador") ||
    original.includes("エクアドル") ||
    original.includes("에콰도르");

  const hasJapan =
    lowerOriginal.includes("japan") ||
    lowerOriginal.includes("japon") ||
    lowerOriginal.includes("japao") ||
    original.includes("日本") ||
    original.includes("일본");

  if (hasEcuador && hasJapan) {
    return "ecuador japan";
  }

  const raw = lowerOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

  if (phraseAliases[raw]) {
    return phraseAliases[raw];
  }

  const normalized = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => aliases[word] || word)
    .filter(
      (word) =>
        ![
          "vs",
          "versus",
          "v",
          "and",
          "the",
          "el",
          "la",
          "de"
        ].includes(word)
    )
    .sort()
    .join(" ");

  return phraseAliases[normalized] || normalized;
}

function displayTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

function parseTraffic(value) {
  if (!value) return 0;

  const number = Number(
    value
      .replace(/,/g, "")
      .replace(/\+/g, "")
      .replace(/\s+/g, "")
  );

  return Number.isFinite(number) ? number : 0;
}

function trafficScore(value) {
  const traffic = parseTraffic(value);

  if (traffic >= 1000000) return 100;
  if (traffic >= 500000) return 95;
  if (traffic >= 200000) return 90;
  if (traffic >= 100000) return 85;
  if (traffic >= 50000) return 75;
  if (traffic >= 20000) return 65;
  if (traffic >= 10000) return 55;
  if (traffic >= 5000) return 45;
  if (traffic >= 2000) return 35;
  if (traffic >= 1000) return 25;
  if (traffic >= 500) return 18;
  if (traffic >= 200) return 12;
  if (traffic >= 100) return 8;

  return 5;
}

function rankScore(rank) {
  if (rank <= 1) return 100;
  if (rank <= 3) return 90;
  if (rank <= 5) return 80;
  if (rank <= 10) return 65;
  if (rank <= 15) return 50;

  return 35;
}

/*
  Calculates real historical movement.

  velocity:
  score change per hour

  acceleration:
  change in velocity compared with the previous interval

  momentum:
  total score change from the previous snapshot
*/
function calculateDynamics(history, currentScore) {
  if (!history || history.length < 2) {
    return {
      momentum: 0,
      velocity: 0,
      acceleration: 0,
      historyCount: history?.length || 0
    };
  }

  const snapshots = [...history]
    .sort(
      (a, b) =>
        new Date(a.captured_at).getTime() -
        new Date(b.captured_at).getTime()
    )
    .slice(-4);

  const latest = snapshots[snapshots.length - 1];

  const previous =
    snapshots.length >= 2
      ? snapshots[snapshots.length - 2]
      : null;

  const older =
    snapshots.length >= 3
      ? snapshots[snapshots.length - 3]
      : null;

  const latestScore = Number(currentScore) || 0;
  const previousScore = Number(previous?.global_score) || 0;

  const momentum = latestScore - previousScore;

  const latestTime = new Date(
    latest?.captured_at
  ).getTime();

  const previousTime = new Date(
    previous?.captured_at
  ).getTime();

  const hours =
    latestTime > previousTime
      ? (latestTime - previousTime) / 3600000
      : 0;

  // Не считаем короткие тестовые интервалы
  // быстрее 10 минут полноценной динамикой.
  const effectiveHours = Math.max(hours, 1 / 6);

  const velocity =
    momentum / effectiveHours;

  let acceleration = 0;

  if (older) {
    const olderTime = new Date(
      older.captured_at
    ).getTime();

    const olderScore =
      Number(older.global_score) || 0;

    const olderHours =
      previousTime > olderTime
        ? (previousTime - olderTime) / 3600000
        : 0;

    const effectiveOlderHours =
      Math.max(olderHours, 1 / 6);

    const previousVelocity =
      (previousScore - olderScore) /
      effectiveOlderHours;

    acceleration =
      velocity - previousVelocity;
  }

  const normalizedVelocity =
    Math.abs(velocity) < 1
      ? 0
      : Number(velocity.toFixed(2));

  const normalizedAcceleration =
    Math.abs(acceleration) < 1
      ? 0
      : Number(acceleration.toFixed(2));

  return {
    momentum,
    velocity: normalizedVelocity,
    acceleration: normalizedAcceleration,
    historyCount: snapshots.length
  };
}

function getDynamicStatus(score, dynamics) {
  const {
    velocity,
    acceleration,
    historyCount
  } = dynamics;

  /*
    Not enough historical data:
    use score only.
  */
  if (historyCount < 2) {
    if (score >= 85) return "VERY HIGH";
    if (score >= 70) return "HIGH";
    if (score >= 55) return "RISING";

    return "EMERGING";
  }

  /*
    Real acceleration.
  */
  if (
    acceleration > 5 &&
    velocity > 5
  ) {
    return "ACCELERATING";
  }

  /*
    Strong positive movement.
  */
  if (velocity > 5) {
    return "RISING";
  }

  /*
    Negative movement.
  */
  if (velocity < -5) {
    return "COOLING";
  }

  return "STABLE";
}

export default async function handler(req, res) {
  try {
    const results = await Promise.all(
      regions.map(async (region) => {
        const response = await fetch(
          `https://trends.google.com/trending/rss?geo=${region.code}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );

        if (!response.ok) {
          throw new Error(
            `Google Trends ${region.code} returned ${response.status}`
          );
        }

        const xml = await response.text();

        const items = [
          ...xml.matchAll(
            /<item>([\s\S]*?)<\/item>/g
          )
        ];

        return items
          .slice(0, 20)
          .map((match, index) => {
            const item = match[1];

            const title = cleanText(
              item.match(
                /<title>([\s\S]*?)<\/title>/
              )?.[1]
            );

            const traffic = cleanText(
              item.match(
                /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/
              )?.[1]
            );

            return {
              title,
              traffic,
              rank: index + 1,
              region: region.name,
              regionCode: region.code
            };
          });
      })
    );

    const trendMap = new Map();

    results.flat().forEach((trend) => {
      if (!trend.title) return;

      const key = normalizeTitle(trend.title);

      if (!key) return;

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          title: displayTitle(trend.title),
          titleKey: key,
          traffic: trend.traffic,
          trafficValue: parseTraffic(
            trend.traffic
          ),
          bestRank: trend.rank,
          regions: [],
          regionCodes: []
        });
      }

      const existing = trendMap.get(key);

      if (
        !existing.regionCodes.includes(
          trend.regionCode
        )
      ) {
        existing.regions.push(
          trend.region
        );

        existing.regionCodes.push(
          trend.regionCode
        );
      }

      if (trend.rank < existing.bestRank) {
        existing.bestRank = trend.rank;
      }

      const currentTraffic =
        parseTraffic(trend.traffic);

      if (
        currentTraffic >
        existing.trafficValue
      ) {
        existing.traffic =
          trend.traffic;

        existing.trafficValue =
          currentTraffic;
      }
    });

    const rawTrends =
      Array.from(trendMap.values())
        .map((trend) => {
          const regionCount =
            trend.regions.length;

          const coverageScore =
            Math.round(
              (regionCount /
                regions.length) *
                100
            );

          const volumeScore =
            trafficScore(
              trend.traffic
            );

          const positionScore =
            rankScore(
              trend.bestRank
            );

          const globalScore =
            Math.round(
              coverageScore * 0.5 +
              volumeScore * 0.3 +
              positionScore * 0.2
            );

          return {
            ...trend,
            regionCount,
            coverageScore,
            volumeScore,
            positionScore,
            globalScore
          };
        })
        .sort(
          (a, b) =>
            b.globalScore -
            a.globalScore
        )
        .slice(0, 20);

    /*
      Load recent history for all current trends
      in one database query.
    */
    const titleKeys =
      rawTrends.map(
        (trend) => trend.titleKey
      );

    let historyRows = [];

    if (titleKeys.length > 0) {
      historyRows = await sql`
        SELECT
          captured_at,
          title_key,
          global_score
        FROM trend_snapshots
        WHERE title_key = ANY(${titleKeys})
        ORDER BY captured_at DESC
        LIMIT 300
      `;
    }

    const historyMap = new Map();

    historyRows.forEach((row) => {
      if (!historyMap.has(row.title_key)) {
        historyMap.set(
          row.title_key,
          []
        );
      }

      historyMap
        .get(row.title_key)
        .push(row);
    });

    const trends = rawTrends.map(
      (trend) => {
        const history =
          historyMap.get(
            trend.titleKey
          ) || [];

        const dynamics =
          calculateDynamics(
            history,
            trend.globalScore
          );

        const status =
          getDynamicStatus(
            trend.globalScore,
            dynamics
          );

        let signal = "MEDIUM";

        if (
          trend.globalScore >= 70
        ) {
          signal = "HIGH";
        }

        if (
          trend.globalScore >= 85
        ) {
          signal = "VERY HIGH";
        }

        return {
          title: trend.title,

          platforms: ["Google"],

          growth:
            `${trend.globalScore}/100`,

          status,

          mentions:
            trend.traffic ||
            "Unknown",

          /*
            Kept as a percentage for
            compatibility with the UI.
          */
          velocity:
            `${dynamics.velocity}%/H`,

          platformCount: 1,

          signal,

          globalScore:
            trend.globalScore,

          coverageScore:
            trend.coverageScore,

          volumeScore:
            trend.volumeScore,

          positionScore:
            trend.positionScore,

          momentum:
            dynamics.momentum,

          velocityScore:
            dynamics.velocity,

          acceleration:
            dynamics.acceleration,

          historyCount:
            dynamics.historyCount,

          regions:
            trend.regions,

          signalBreakdown: [
            trend.coverageScore,
            trend.volumeScore,
            trend.positionScore,
            trend.globalScore
          ],

          description:
            `Signal calculated from global coverage, search volume and regional position across ${regions.length} tracked regions.`
        };
      }
    );

    res.status(200).json({
      success: true,

      source:
        "Google Trends Global",

      scoring: {
        coverage: "50%",
        volume: "30%",
        position: "20%"
      },

      dynamics: {
        momentum:
          "Current score minus previous snapshot",

        velocity:
          "Score change per hour",

        acceleration:
          "Change in velocity"
      },

      regionsTracked:
        regions.length,

      updatedAt:
        new Date().toISOString(),

      count:
        trends.length,

      trends
    });

  } catch (error) {
    console.error(
      "UNKNOWN Global Trends API error:",
      error
    );

    res.status(500).json({
      success: false,

      source:
        "Google Trends Global",

      error:
        "Failed to load global trends"
    });
  }
}