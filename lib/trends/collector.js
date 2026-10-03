import { chooseDisplayTitle, collectGoogleObservations } from "./source-google.js";
import { scoreTrend } from "./scoring.js";

function aggregateObservations(observations, regionsTracked) {
  const groups = new Map();

  for (const observation of observations) {
    if (!groups.has(observation.titleKey)) {
      groups.set(observation.titleKey, {
        title: observation.title,
        titleKey: observation.titleKey,
        regions: new Map(),
        ranks: new Map(),
        maxTraffic: 0,
        regionsTracked
      });
    }

    const group = groups.get(observation.titleKey);
    group.title = chooseDisplayTitle(group.title, observation.title, group.titleKey);
    group.regions.set(observation.region.code, observation.region);
    group.ranks.set(
      observation.region.code,
      Math.min(group.ranks.get(observation.region.code) ?? Infinity, observation.rank)
    );
    group.maxTraffic = Math.max(group.maxTraffic, observation.traffic);
  }

  return [...groups.values()];
}

export function collapseSnapshots(rows, windowMs = 30 * 60 * 1000) {
  const byKey = new Map();

  for (const row of rows || []) {
    const key = row.title_key || row.titleKey || "_";
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const collapsed = [];
  for (const list of byKey.values()) {
    const ordered = [...list].sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at));
    let lastKept = null;

    for (const row of ordered) {
      if (lastKept && Math.abs(new Date(lastKept.captured_at) - new Date(row.captured_at)) < windowMs) continue;
      collapsed.push(row);
      lastKept = row;
    }
  }

  return collapsed;
}

async function loadHistory(sql, titleKeys) {
  if (!sql || !titleKeys.length) return [];

  const rows = await sql`
    SELECT title_key, captured_at, global_score
    FROM trend_snapshots
    WHERE title_key = ANY(${titleKeys})
    ORDER BY captured_at DESC
  `;

  return collapseSnapshots(rows);
}

export async function collectScoredTrends(sql) {
  const source = await collectGoogleObservations();
  const groups = aggregateObservations(source.observations, source.regionsTracked);
  const historyRows = await loadHistory(sql, groups.map((group) => group.titleKey));
  const historyByKey = new Map();

  for (const row of historyRows) {
    if (!historyByKey.has(row.title_key)) historyByKey.set(row.title_key, []);
    historyByKey.get(row.title_key).push(row);
  }

  const trends = groups
    .map((group) => scoreTrend(group, historyByKey.get(group.titleKey) || []))
    .sort((a, b) => b.globalScore - a.globalScore)
    .slice(0, 20);

  return {
    ...source,
    trends
  };
}

export async function persistSnapshots(sql, trends) {
  if (!sql || !trends.length) return 0;

  const titleKeys = [...new Set(trends.map((trend) => trend.titleKey).filter(Boolean))];
  const existing = titleKeys.length
    ? await sql`
        SELECT title_key, captured_at
        FROM trend_snapshots
        WHERE title_key = ANY(${titleKeys})
        ORDER BY captured_at DESC
      `
    : [];
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  const recentKeys = new Set(
    existing
      .filter((row) => new Date(row.captured_at).getTime() > cutoff)
      .map((row) => row.title_key)
  );

  let saved = 0;
  for (const trend of trends) {
    if (recentKeys.has(trend.titleKey)) continue;
    recentKeys.add(trend.titleKey);
    saved += 1;
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

  return saved;
}
