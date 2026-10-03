const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

function formatCompactNumber(value) {
  const safe = Number(value) || 0;
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(safe >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(Math.round(safe));
}

function formatSignedPercent(value) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function formatSignedPoints(value) {
  const rounded = Math.round(Number(value) || 0);
  return `${rounded >= 0 ? "+" : ""}${rounded} pts`;
}

function trafficScore(traffic) {
  if (traffic >= 1_000_000) return 100;
  if (traffic >= 500_000) return 95;
  if (traffic >= 200_000) return 90;
  if (traffic >= 100_000) return 85;
  if (traffic >= 50_000) return 75;
  if (traffic >= 20_000) return 65;
  if (traffic >= 10_000) return 55;
  if (traffic >= 5_000) return 45;
  if (traffic >= 2_000) return 35;
  if (traffic >= 1_000) return 25;
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

function calculateConfidence(historyCount, coverageScore) {
  if (!historyCount) return null;
  const historyEvidence = Math.min(100, historyCount * 20);
  return Math.round(historyEvidence * 0.7 + coverageScore * 0.3);
}

function calculateDynamics(globalScore, history) {
  const validHistory = history.filter((row) => Number.isFinite(Number(row?.global_score)));
  if (!validHistory.length) {
    return { previousScore: null, olderScore: null, momentum: null, velocity: null, acceleration: null };
  }

  const previousScore = Number(validHistory[0].global_score);
  const olderScore = validHistory.length > 1 ? Number(validHistory[1].global_score) : null;
  const momentum = globalScore - previousScore;
  const velocity = momentum;
  const previousVelocity = olderScore == null ? null : previousScore - olderScore;
  const acceleration = previousVelocity == null ? null : momentum - previousVelocity;

  return { previousScore, olderScore, momentum, velocity, acceleration };
}

function calculateMomentumScore(momentum) {
  return momentum == null ? null : Math.round(clamp(50 + momentum * 3));
}

function calculateEmergingScore({ momentum, acceleration, coverageScore, historyCount }) {
  if (momentum == null || (momentum <= 0 && (acceleration == null || acceleration <= 0))) return 0;

  const velocitySignal = clamp(50 + momentum * 5);
  const accelerationSignal = acceleration == null ? 50 : clamp(50 + acceleration * 8);
  const recencySignal = Math.max(20, 100 - Math.max(0, historyCount - 1) * 5);

  return Math.round(
    velocitySignal * 0.5 +
    accelerationSignal * 0.25 +
    recencySignal * 0.1 +
    coverageScore * 0.15
  );
}

function getStatus(globalScore, dynamics) {
  if (dynamics.momentum == null) return "NEW";
  if (globalScore >= 80 && dynamics.momentum > 0) return "BREAKOUT";
  if (dynamics.momentum > 0) return "RISING";
  if (dynamics.momentum < 0) return "COOLING";
  return "STABLE";
}

function buildDescription({ title, status, regionCount, momentum }) {
  if (status === "NEW") return `${title} is a new signal across ${regionCount} tracked regions. Historical data is being collected.`;
  if (momentum > 10) return `${title} is gaining momentum across ${regionCount} tracked regions.`;
  if (momentum > 0) return `${title} is showing early upward movement across ${regionCount} tracked regions.`;
  if (momentum < -10) return `${title} is losing momentum across the tracked regions.`;
  return `${title} is currently stable across ${regionCount} tracked regions.`;
}

export function scoreTrend(group, history = []) {
  const uniqueRegions = [...group.regions.values()];
  const trackedRegions = Math.max(0, Number(group.regionsTracked) || 0);
  const coverageScore = trackedRegions
    ? clamp(Math.round((uniqueRegions.length / trackedRegions) * 100))
    : 0;
  const volumeScore = trafficScore(group.maxTraffic);
  const positionValues = [...group.ranks.values()].map(rankScore);
  const positionScore = positionValues.length
    ? Math.round(positionValues.reduce((sum, value) => sum + value, 0) / positionValues.length)
    : 0;
  // A one-region traffic spike is not a global signal. Keep the raw volume
  // score for the breakdown, but do not let it dominate Global Score.
  const effectiveVolume = uniqueRegions.length <= 1 ? Math.round(volumeScore * 0.4) : volumeScore;
  const globalScore = Math.round(coverageScore * 0.5 + effectiveVolume * 0.3 + positionScore * 0.2);
  const dynamics = calculateDynamics(globalScore, history);
  const momentumScore = calculateMomentumScore(dynamics.momentum);
  const validHistoryCount = history.filter((row) => Number.isFinite(Number(row?.global_score))).length;
  const confidenceScore = calculateConfidence(validHistoryCount, coverageScore);
  const emergingScore = calculateEmergingScore({
    momentum: dynamics.momentum,
    acceleration: dynamics.acceleration,
    coverageScore,
    historyCount: validHistoryCount
  });
  const status = getStatus(globalScore, dynamics);
  const growth = dynamics.previousScore == null
    ? null
    : formatSignedPercent(((globalScore - dynamics.previousScore) / Math.max(1, dynamics.previousScore)) * 100);

  return {
    title: group.title,
    titleKey: group.titleKey,
    growth,
    status,
    mentions: formatCompactNumber(group.maxTraffic),
    velocity: dynamics.velocity == null ? null : formatSignedPoints(dynamics.velocity),
    platforms: ["Google Trends"],
    platformCount: 1,
    signal: globalScore >= 80 ? "HIGH" : globalScore >= 60 ? "MEDIUM" : "LOW",
    historyCount: validHistoryCount,
    history: history
      .filter((row) => Number.isFinite(Number(row?.global_score)))
      .map((row) => ({ captured_at: row.captured_at, global_score: Number(row.global_score) })),
    globalScore,
    momentumScore,
    confidenceScore,
    emergingScore,
    coverageScore,
    volumeScore,
    positionScore,
    momentum: dynamics.momentum,
    acceleration: dynamics.acceleration,
    signalBreakdown: { coverage: coverageScore, volume: volumeScore, position: positionScore, global: globalScore },
    description: buildDescription({ title: group.title, status, regionCount: uniqueRegions.length, momentum: dynamics.momentum || 0 }),
    regions: uniqueRegions
  };
}

export { clamp, formatCompactNumber, trafficScore, rankScore };
