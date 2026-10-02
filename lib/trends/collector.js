import { collectGoogleObservations } from "./source-google.js";
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
    group.regions.set(observation.region.code, observation.region);
    group.ranks.set(
      observation.region.code,
      Math.min(group.ranks.get(observation.region.code) ?? Infinity, observation.rank)
    );
    group.maxTraffic = Math.max(group.maxTraffic, observation.traffic);
  }

  return [...groups.values()];
}

async function loadHistory(sql, titleKeys) {
  if (!sql || !titleKeys.length) return [];

  return sql`
    SELECT title_key, captured_at, global_score
    FROM trend_snapshots
    WHERE title_key = ANY(${titleKeys})
    ORDER BY captured_at DESC
  `;
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

  return trends.length;
}
