export const REGIONS = [
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

export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");
}

export function cleanText(value) {
  return decodeHtml(String(value ?? "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim());
}

const SIDE_ALIASES = new Map([
  ["ind", "india"],
  ["india", "india"],
  ["\u092d\u093e\u0930\u0924", "india"],
  ["wi", "west indies"],
  ["west indies", "west indies"],
  ["westindies", "west indies"],
  ["\u0935\u0947\u0938\u094d\u091f\u0907\u0902\u0921\u0940\u091c", "west indies"],
  ["pak", "pakistan"],
  ["pakistan", "pakistan"],
  ["aus", "australia"],
  ["eng", "england"],
  ["sa", "south africa"],
  ["nz", "new zealand"],
  ["ban", "bangladesh"],
  ["sl", "sri lanka"]
]);

function canonicalizeSide(side) {
  const key = side.replace(/\s+/g, " ").trim();
  return SIDE_ALIASES.get(key) || key;
}

function canonicalizeMatchup(value) {
  const match = value.match(/^(.+?)\s+(?:vs|versus|v|x|\u092c\u0928\u093e\u092e|\u5bfe|\u5bf9|\ub300|gegen|contre)\s+(.+)$/u);
  if (!match) return value;

  const sides = [match[1], match[2]].map(canonicalizeSide).filter(Boolean).sort();
  return sides.length === 2 ? `${sides[0]} vs ${sides[1]}` : value;
}

export function normalizeTitleKey(value) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? canonicalizeMatchup(normalized) : null;
}

export function chooseDisplayTitle(current, candidate, titleKey) {
  if (!current) return candidate;
  const score = (title) => {
    let points = String(title).length;
    if (/[A-Za-z]/.test(title)) points += 15;
    if (normalizeTitleKey(title) === titleKey) points += 25;
    return points;
  };
  return score(candidate) > score(current) ? candidate : current;
}

export function parseTraffic(value) {
  const text = cleanText(value).toUpperCase();
  const match = text.match(/([\d,.]+)\s*([KMB])?/);
  if (!match) return 0;

  const number = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(number)) return 0;

  const multiplier = match[2] === "K"
    ? 1_000
    : match[2] === "M"
      ? 1_000_000
      : match[2] === "B"
        ? 1_000_000_000
        : 1;

  return Math.round(number * multiplier);
}

export function parseGoogleTrendsRss(xml, region) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const [index, itemXml] of itemMatches.slice(0, 20).entries()) {
    const title = cleanText(itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
    if (!title) continue;

    const titleKey = normalizeTitleKey(title);
    if (!titleKey) continue;

    const trafficText = cleanText(itemXml.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1]);
    const publishedAt = cleanText(itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]);

    items.push({
      title,
      titleKey,
      traffic: parseTraffic(trafficText),
      trafficLabel: trafficText || null,
      rank: index + 1,
      region: { code: region.code, name: region.name },
      publishedAt: publishedAt || null
    });
  }

  return items;
}

async function fetchRegion(region) {
  const response = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(region.gl)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UNKNOWN-Trends/1.0)" }
  });

  if (!response.ok) {
    throw new Error(`Google Trends returned ${response.status} for ${region.code}`);
  }

  return parseGoogleTrendsRss(await response.text(), region);
}

export async function collectGoogleObservations() {
  const settled = await Promise.allSettled(REGIONS.map(fetchRegion));
  const observations = [];
  const failedRegions = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") observations.push(...result.value);
    else failedRegions.push({ code: REGIONS[index].code, name: REGIONS[index].name });
  });

  if (!observations.length) {
    throw new Error("Google Trends returned no observations");
  }

  return {
    observations,
    regionsTracked: REGIONS.length,
    regionsSucceeded: REGIONS.length - failedRegions.length,
    failedRegions
  };
}
