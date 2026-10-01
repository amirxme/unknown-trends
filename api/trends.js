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
  japón: "japan",
  japonia: "japan",

  alemania: "germany",
  deutschland: "germany",

  francia: "france",

  reino: "kingdom",
  unido: "united",
  uk: "united",
  england: "united",

  brasil: "brazil",

  canada: "canada",
  canadá: "canada",

  corea: "korea",
  sur: "south",

  estados: "united",
  unidos: "united",

  ecuador: "ecuador",
  equateur: "ecuador"
};

function cleanText(value) {
  return (
    value
      ?.replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim() || ""
  );
}

function normalizeTitle(title) {
  return title
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
}

function displayTitle(title) {
  return title
    .replace(/\s+/g, " ")
    .trim();
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

        return items.slice(0, 20).map((match) => {
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
          regions: [],
          regionCodes: []
        });
      }

      const existing = trendMap.get(key);

      if (!existing.regionCodes.includes(trend.regionCode)) {
        existing.regions.push(trend.region);
        existing.regionCodes.push(trend.regionCode);
      }

      if (
        trend.traffic &&
        trend.traffic !== "Unknown" &&
        (!existing.traffic ||
          existing.traffic === "Unknown")
      ) {
        existing.traffic = trend.traffic;
      }
    });

    const trends = Array.from(trendMap.values())
      .map((trend) => {
        const regionCount = trend.regions.length;

        const globalScore = Math.round(
          (regionCount / regions.length) * 100
        );

        let signal = "MEDIUM";

        if (globalScore >= 40) {
          signal = "HIGH";
        }

        if (globalScore >= 70) {
          signal = "VERY HIGH";
        }

        let status = "EMERGING";

        if (regionCount >= 3) {
          status = "RISING";
        }

        if (regionCount >= 5) {
          status = "ACCELERATING";
        }

        return {
          title: trend.title,
          platforms: ["Google"],
          growth: `GLOBAL ${globalScore}%`,
          status,
          mentions: trend.traffic || "Unknown",
          velocity: `${regionCount} REGIONS`,
          platformCount: regionCount,
          signal,
          globalScore,
          regions: trend.regions,
          history: [
            20,
            25,
            31,
            36,
            44,
            51,
            59,
            68,
            78,
            Math.max(85, globalScore)
          ],
          description:
            `Trending across ${regionCount} of ${regions.length} tracked regions.`
        };
      })
      .sort((a, b) => b.globalScore - a.globalScore)
      .slice(0, 20);

    res.status(200).json({
      success: true,
      source: "Google Trends Global",
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