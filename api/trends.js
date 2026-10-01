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
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
          ...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
        ];

        return items.slice(0, 20).map((match, index) => {
          const item = match[1];

          const title = cleanText(
            item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
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
          traffic: trend.traffic,
          trafficValue: parseTraffic(trend.traffic),
          bestRank: trend.rank,
          regions: [],
          regionCodes: []
        });
      }

      const existing = trendMap.get(key);

      if (!existing.regionCodes.includes(trend.regionCode)) {
        existing.regions.push(trend.region);
        existing.regionCodes.push(trend.regionCode);
      }

      if (trend.rank < existing.bestRank) {
        existing.bestRank = trend.rank;
      }

      const currentTraffic = parseTraffic(trend.traffic);

      if (currentTraffic > existing.trafficValue) {
        existing.traffic = trend.traffic;
        existing.trafficValue = currentTraffic;
      }
    });

    const trends = Array.from(trendMap.values())
      .map((trend) => {
        const regionCount = trend.regions.length;

        const coverageScore = Math.round(
          (regionCount / regions.length) * 100
        );

        const volumeScore = trafficScore(trend.traffic);

        const positionScore = rankScore(trend.bestRank);

        const globalScore = Math.round(
          coverageScore * 0.5 +
          volumeScore * 0.3 +
          positionScore * 0.2
        );

        let signal = "MEDIUM";

        if (globalScore >= 70) {
          signal = "HIGH";
        }

        if (globalScore >= 85) {
          signal = "VERY HIGH";
        }

        let status = "EMERGING";

        if (globalScore >= 55) {
          status = "RISING";
        }

        if (globalScore >= 75) {
          status = "ACCELERATING";
        }

        return {
          title: trend.title,

          platforms: ["Google"],

          growth: `SIGNAL ${globalScore}`,

          status,

          mentions: trend.traffic || "Unknown",

          velocity: `${regionCount} REGIONS`,

          platformCount: regionCount,

          signal,

          globalScore,

          coverageScore,

          volumeScore,

          positionScore,

          regions: trend.regions,

          history: [
            Math.max(20, positionScore - 35),
            Math.max(25, positionScore - 30),
            Math.max(30, positionScore - 25),
            Math.max(35, positionScore - 20),
            Math.max(40, positionScore - 15),
            Math.max(45, positionScore - 10),
            Math.max(50, positionScore - 7),
            Math.max(55, positionScore - 4),
            Math.max(60, positionScore - 2),
            globalScore
          ],

          description:
            `Signal calculated from global coverage, search volume and regional position across ${regions.length} tracked regions.`
        };
      })
      .sort((a, b) => b.globalScore - a.globalScore)
      .slice(0, 20);

    res.status(200).json({
      success: true,

      source: "Google Trends Global",

      scoring: {
        coverage: "50%",
        volume: "30%",
        position: "20%"
      },

      regionsTracked: regions.length,

      updatedAt: new Date().toISOString(),

      count: trends.length,

      trends
    });

  } catch (error) {
    console.error(
      "UNKNOWN Global Trends API error:",
      error
    );

    res.status(500).json({
      success: false,

      source: "Google Trends Global",

      error: "Failed to load global trends"
    });
  }
}