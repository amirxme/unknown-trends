export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://trends.google.com/trending/rss?geo=US",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Trends returned ${response.status}`);
    }

    const xml = await response.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    const trends = items.slice(0, 10).map((match, index) => {
      const item = match[1];

      const title =
        item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
          ?.replace(/<!\[CDATA\[|\]\]>/g, "")
          .trim() || `Trend ${index + 1}`;

      const traffic =
        item.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/)?.[1]
          ?.replace(/<!\[CDATA\[|\]\]>/g, "")
          .trim() || "Unknown";

      return {
        title,
        platforms: ["Google"],
        growth: "TRENDING",
        status: "ACTIVE",
        mentions: traffic,
        velocity: "LIVE",
        platformCount: 1,
        signal: "HIGH",
        history: [20, 28, 35, 42, 51, 59, 67, 74, 84, 92],
        description:
          `Currently trending on Google Search. Approximate search volume: ${traffic}.`
      };
    });

    res.status(200).json({
      success: true,
      source: "Google Trends",
      updatedAt: new Date().toISOString(),
      count: trends.length,
      trends
    });

  } catch (error) {

    console.error("UNKNOWN Trends API error:", error);

    res.status(500).json({
      success: false,
      source: "Google Trends",
      error: "Failed to load live trends"
    });
  }
}