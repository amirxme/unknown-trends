const state = {
  trends: [],
  activePlatform: "all",
  activeExploreFilter: "all"
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  searchButton: document.getElementById("searchButton"),
  trendList: document.getElementById("trendList"),
  platformButtons: [...document.querySelectorAll(".platform")],
  exploreInput: document.getElementById("exploreInput"),
  exploreResults: document.getElementById("exploreResults"),
  exploreFilters: [...document.querySelectorAll(".explore-filter")],
  exploreCount: document.getElementById("exploreCount"),
  signalCount: document.getElementById("signalCount"),
  heroSignalCount: document.getElementById("heroSignalCount")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clampNumber(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function optionalScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? clampNumber(number, 0, 100) : null;
}

function displayValue(value, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function regionLabel(count) {
  const value = Number(count) || 0;
  return `${value} ${value === 1 ? "REGION" : "REGIONS"}`;
}

function normalizeTrend(rawTrend = {}) {
  const trend = rawTrend && typeof rawTrend === "object" ? rawTrend : {};
  const platforms = Array.isArray(trend.platforms)
    ? trend.platforms.filter(Boolean).map((platform) => String(platform).trim()).filter(Boolean)
    : [];

  const normalizedPlatforms = platforms.length ? platforms : ["Google Trends"];

  return {
    title: String(trend.title ?? "Unknown trend").trim() || "Unknown trend",
    titleKey: String(trend.titleKey ?? trend.title ?? "").trim(),
    platforms: normalizedPlatforms,
    platformCount: Number(trend.platformCount) || normalizedPlatforms.length || 1,
    regions: Array.isArray(trend.regions)
      ? trend.regions.filter(Boolean).map((region) => typeof region === "string"
        ? { code: region, name: region }
        : { code: String(region.code ?? ""), name: String(region.name ?? region.code ?? "") })
      : [],
    growth: trend.growth != null ? String(trend.growth) : null,
    status: String(trend.status ?? "STABLE").toUpperCase(),
    mentions: trend.mentions != null ? String(trend.mentions) : "0",
    velocity: trend.velocity != null ? String(trend.velocity) : null,
    signal: String(trend.signal ?? "LOW").toUpperCase(),
    history: Array.isArray(trend.history) ? trend.history : [],
    historyCount: Number(trend.historyCount) || (Array.isArray(trend.history) ? trend.history.length : 0),
    momentumScore: optionalScore(trend.momentumScore),
    confidenceScore: optionalScore(trend.confidenceScore),
    emergingScore: optionalScore(trend.emergingScore),
    globalScore: optionalScore(trend.globalScore) ?? 0,
    acceleration: trend.acceleration == null ? null : Number(trend.acceleration),
    description: String(trend.description ?? "No description available.").trim() || "No description available.",
    signalBreakdown: trend.signalBreakdown && typeof trend.signalBreakdown === "object"
      ? {
          coverage: clampNumber(trend.signalBreakdown.coverage, 0, 100),
          volume: clampNumber(trend.signalBreakdown.volume, 0, 100),
          position: clampNumber(trend.signalBreakdown.position, 0, 100),
          global: clampNumber(trend.signalBreakdown.global, 0, 100)
        }
      : { coverage: 0, volume: 0, position: 0, global: 0 }
  };
}

function getSignalBreakdownValues(signalBreakdown) {
  if (Array.isArray(signalBreakdown)) {
    return signalBreakdown;
  }

  if (signalBreakdown && typeof signalBreakdown === "object") {
    return [
      Number(signalBreakdown.coverage) || 0,
      Number(signalBreakdown.volume) || 0,
      Number(signalBreakdown.position) || 0,
      Number(signalBreakdown.global) || 0
    ];
  }

  return [0, 0, 0, 0];
}

function buildEmptyTrendState(message, subtitle) {
  return `
    <div class="trend trend-empty">
      <div></div>
      <div class="trend-main">
        <h3>${escapeHtml(message)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <strong>—</strong>
    </div>
  `;
}

function renderTrends(items) {
  if (!elements.trendList) return;

  elements.trendList.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    elements.trendList.innerHTML = buildEmptyTrendState("No signals found", "Try another search or platform.");
    return;
  }

  const normalizedItems = items.map(normalizeTrend);
  const topTrend = normalizedItems[0];
  const momentum = topTrend.momentumScore == null ? 0 : clampNumber(topTrend.momentumScore, 0, 100);
  const momentumLabel = momentum >= 70 ? "HIGH MOMENTUM" : momentum >= 50 ? "RISING MOMENTUM" : "LOW MOMENTUM";

  const momentumIndex = document.createElement("section");
  momentumIndex.className = "momentum-index";
  momentumIndex.innerHTML = `
    <div class="momentum-index-head">
      <div>
        <p class="eyebrow">MOMENTUM INDEX</p>
        <h2>${momentum}<span>/100</span></h2>
      </div>
      <span class="momentum-index-status">${escapeHtml(momentumLabel)}</span>
    </div>
    <div class="momentum-index-main">
      <div>
        <strong>${escapeHtml(topTrend.title)}</strong>
        <span>${escapeHtml(topTrend.status)} · ${escapeHtml(displayValue(topTrend.velocity))}</span>
      </div>
      <div class="momentum-index-bar">
        <div class="momentum-index-fill" style="width: ${momentum}%"></div>
      </div>
    </div>
  `;
  momentumIndex.addEventListener("click", () => openTrend(topTrend));
  elements.trendList.appendChild(momentumIndex);

  const ranking = document.createElement("section");
  ranking.className = "momentum-ranking";
  ranking.innerHTML = `
    <div class="momentum-ranking-head">
      <p class="eyebrow">MOMENTUM RANKING</p>
      <span>TOP ${Math.min(5, normalizedItems.length)}</span>
    </div>
  `;

  normalizedItems.slice(0, 5).forEach((trend, index) => {
    const row = document.createElement("article");
    row.className = "momentum-ranking-row";
    const score = clampNumber(trend.momentumScore, 0, 100);
    row.innerHTML = `
      <span class="momentum-ranking-rank">${String(index + 1).padStart(2, "0")}</span>
      <div class="momentum-ranking-main">
        <strong>${escapeHtml(trend.title)}</strong>
      <span>${escapeHtml(trend.status)} · ${escapeHtml(displayValue(trend.velocity))}</span>
      </div>
      <strong class="momentum-ranking-score">${score}</strong>
    `;
    row.addEventListener("click", () => openTrend(trend));
    ranking.appendChild(row);
  });

  elements.trendList.appendChild(ranking);

  normalizedItems.forEach((trend, index) => {
    const article = document.createElement("article");
    article.className = "trend";
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    const statusClass = trend.status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const momentumScore = trend.momentumScore == null ? null : clampNumber(trend.momentumScore, 0, 100);
    article.innerHTML = `
      <div class="trend-card-top">
        <span class="rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="trend-status trend-status-${statusClass}">${escapeHtml(trend.status)}</span>
      </div>
      <div class="trend-card-main">
        <div class="trend-main">
          <h3>${escapeHtml(trend.title)}</h3>
          <p>${escapeHtml((trend.platforms || []).join(" · "))} <span>·</span> ${regionLabel(trend.regions.length)}</p>
        </div>
        <div class="trend-growth">
          <strong>${escapeHtml(displayValue(trend.growth))}</strong>
          <span>GROWTH</span>
        </div>
      </div>
      <div class="trend-card-metrics">
        <div><span>GLOBAL</span><strong>${trend.globalScore}</strong></div>
        <div><span>MOMENTUM</span><strong>${momentumScore == null ? "—" : momentumScore}</strong></div>
        <div><span>CONFIDENCE</span><strong>${trend.confidenceScore == null ? "—" : `${clampNumber(trend.confidenceScore, 0, 100)}%`}</strong></div>
      </div>
    `;
    article.addEventListener("click", () => openTrend(trend));
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTrend(trend);
      }
    });
    elements.trendList.appendChild(article);
  });
}

function filterTrends() {
  if (!elements.trendList) return;

  const query = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : "";
  const filtered = state.trends
    .map(normalizeTrend)
    .filter((trend) => {
      const activeFilter = String(state.activePlatform).toUpperCase();
      const matchesPlatform = activeFilter === "ALL" || trend.status === activeFilter;

      const matchesSearch = !query ||
        trend.title.toLowerCase().includes(query) ||
        trend.platforms.some((platform) => platform.toLowerCase().includes(query)) ||
        (trend.description || "").toLowerCase().includes(query);

      return matchesPlatform && matchesSearch;
    });

  renderTrends(filtered);

  if (elements.signalCount) {
    elements.signalCount.textContent = String(filtered.length);
  }
  if (elements.heroSignalCount) {
    elements.heroSignalCount.textContent = String(state.trends.length);
  }

  const emergingList = document.getElementById("emergingList");
  if (!emergingList) return;

  const emergingItems = [...filtered]
    .sort((a, b) => (Number(b.emergingScore) || 0) - (Number(a.emergingScore) || 0))
    .filter((trend) => Number(trend.emergingScore) > 0)
    .slice(0, 5);

  emergingList.innerHTML = "";

  if (emergingItems.length === 0) {
    emergingList.innerHTML = buildEmptyTrendState("No emerging signals yet", "The system is waiting for early movement.");
    return;
  }

  emergingItems.forEach((trend, index) => {
    const article = document.createElement("article");
    article.className = "trend";
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    const emergingScore = clampNumber(trend.emergingScore, 0, 100);
    article.innerHTML = `
      <div class="trend-card-top">
        <span class="rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="trend-status trend-status-emerging">EMERGING</span>
      </div>
      <div class="trend-card-main">
        <div class="trend-main">
          <h3>${escapeHtml(trend.title)}</h3>
          <p>${escapeHtml(`${trend.status} · ${displayValue(trend.velocity)}`)}</p>
        </div>
        <div class="trend-growth">
          <strong>${trend.emergingScore == null ? "—" : emergingScore}</strong>
          <span>EMERGING SCORE</span>
        </div>
      </div>
      <div class="trend-card-metrics">
        <div><span>GLOBAL</span><strong>${trend.globalScore}</strong></div>
        <div><span>MOMENTUM</span><strong>${trend.momentumScore == null ? "—" : clampNumber(trend.momentumScore, 0, 100)}</strong></div>
        <div><span>REGIONS</span><strong>${trend.regions.length}</strong></div>
      </div>
    `;
    article.addEventListener("click", () => openTrend(trend));
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTrend(trend);
      }
    });
    emergingList.appendChild(article);
  });
}

function createSignalGraph(signalBreakdown) {
  const width = 700;
  const height = 180;
  const padding = 10;
  const values = getSignalBreakdownValues(signalBreakdown);
  const points = values.map((value, index) => {
    const x = values.length === 1
      ? width / 2
      : padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((clampNumber(value, 0, 100) / 100) * (height - padding * 2));
    return `${x},${y}`;
  });

  return `
    <div class="signal-graph">
      <div class="graph-head">
        <span>SIGNAL COMPOSITION</span>
        <span>0 — 100</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Signal composition graph">
        <line x1="0" y1="25%" x2="${width}" y2="25%" class="graph-grid" />
        <line x1="0" y1="50%" x2="${width}" y2="50%" class="graph-grid" />
        <line x1="0" y1="75%" x2="${width}" y2="75%" class="graph-grid" />
        <polyline points="${points.join(" ")}" class="graph-line" />
      </svg>
      <div class="graph-labels">
        <span>COVERAGE</span>
        <span>VOLUME</span>
        <span>POSITION</span>
        <span>GLOBAL</span>
      </div>
    </div>
  `;
}

function createHistoryGraph(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return `
      <div class="signal-graph">
        <div class="graph-head">
          <span>HISTORICAL SIGNAL</span>
          <span>NO DATA</span>
        </div>
        <p style="margin:16px 0 0; opacity:.55;">Historical snapshots will appear here as the system collects them.</p>
      </div>
    `;
  }

  const width = 700;
  const height = 180;
  const padding = 10;
  const values = history.map((item) => clampNumber(item.global_score || item.globalScore || 0, 0, 100));
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value / 100) * (height - padding * 2));
    return `${x},${y}`;
  });

  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const change = last - first;
  const changeLabel = change > 0 ? `+${change}` : `${change}`;

  const timestamps = history.map((item) => {
    const date = new Date(item.captured_at || item.capturedAt || Date.now());
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  return `
    <div class="signal-graph">
      <div class="graph-head">
        <span>HISTORICAL SIGNAL</span>
        <span>${escapeHtml(changeLabel)} SCORE</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Historical signal graph">
        <line x1="0" y1="25%" x2="${width}" y2="25%" class="graph-grid" />
        <line x1="0" y1="50%" x2="${width}" y2="50%" class="graph-grid" />
        <line x1="0" y1="75%" x2="${width}" y2="75%" class="graph-grid" />
        <polyline points="${points.join(" ")}" class="graph-line" />
      </svg>
      <div class="graph-labels">
        <span>${escapeHtml(timestamps[0] || "")}</span>
        <span>${escapeHtml(timestamps[Math.floor(timestamps.length / 2)] || "")}</span>
        <span>${escapeHtml(timestamps[timestamps.length - 1] || "")}</span>
      </div>
    </div>
  `;
}

async function loadHistory(titleKey) {
  const safeTitle = titleKey || "";
  if (!safeTitle) return [];

  try {
    const response = await fetch(`/api/history?title=${encodeURIComponent(safeTitle)}`);
    if (!response.ok) throw new Error("History request failed");
    const payload = await response.json();
    return Array.isArray(payload?.history) ? payload.history : [];
  } catch (error) {
    console.error("UNKNOWN history API error:", error);
    return [];
  }
}

async function openTrend(trend) {
  if (!elements.trendList) return;

  const safeTrend = normalizeTrend(trend);
  const confidence = safeTrend.confidenceScore == null ? null : clampNumber(safeTrend.confidenceScore, 0, 100);
  const momentum = safeTrend.momentumScore == null ? null : clampNumber(safeTrend.momentumScore, 0, 100);

  let confidenceLabel = "LOW CONFIDENCE";
  if (confidence >= 75) confidenceLabel = "HIGH CONFIDENCE";
  else if (confidence >= 50) confidenceLabel = "MEDIUM CONFIDENCE";

  elements.trendList.innerHTML = `
    <article class="trend-detail">
      <button class="back-button" id="backButton" type="button">← BACK TO TRENDS</button>
      <p class="eyebrow">SIGNAL</p>
      <h2>${escapeHtml(safeTrend.title)}</h2>

      <div class="detail-meta">
        <span>GROWTH<strong>${escapeHtml(displayValue(safeTrend.growth))}</strong></span>
        <span>MOMENTUM<strong>${momentum == null ? "—" : `${momentum}/100`}</strong>
          <div class="momentum-meter"><div class="momentum-meter-fill" style="width: ${momentum ?? 0}%"></div></div>
          <small class="momentum-status">${escapeHtml(safeTrend.status)}</small>
        </span>
      </div>

      <div class="detail-meta">
        <span>EMERGING SCORE<strong>${safeTrend.emergingScore == null ? "—" : `${clampNumber(safeTrend.emergingScore, 0, 100)}/100`}</strong></span>
        <span>WHY EMERGING<strong>${escapeHtml(displayValue(safeTrend.velocity))}</strong><small class="momentum-status">VELOCITY · ACCELERATION · MOMENTUM · EARLY SIGNAL</small></span>
      </div>

      <div class="detail-meta">
        <span>CONFIDENCE<strong>${confidence == null ? "—" : `${confidence}%`}</strong>
          <div class="momentum-meter"><div class="momentum-meter-fill" style="width: ${confidence ?? 0}%"></div></div>
          <small class="momentum-status">${escapeHtml(confidence == null ? "HISTORICAL DATA IS BEING COLLECTED" : confidenceLabel)} · ${safeTrend.historyCount} HISTORICAL SNAPSHOT${safeTrend.historyCount === 1 ? "" : "S"}</small>
        </span>
        <span>STATUS<strong>${escapeHtml(safeTrend.status)}</strong></span>
      </div>

      <div class="detail-meta">
        <span>VELOCITY<strong>${escapeHtml(displayValue(safeTrend.velocity))}</strong></span>
        <span>MENTIONS<strong>${escapeHtml(safeTrend.mentions)}</strong></span>
      </div>

      <div class="detail-meta">
        <span>SIGNAL<strong>${escapeHtml(safeTrend.signal)}</strong></span>
        <span>HISTORY<strong>${safeTrend.historyCount}</strong></span>
      </div>

      ${createSignalGraph(safeTrend.signalBreakdown)}

      <div id="trendHistory">
        <div class="signal-graph">
          <div class="graph-head">
            <span>HISTORICAL SIGNAL</span>
            <span>LOADING</span>
          </div>
        </div>
      </div>

      <p class="detail-platforms">${escapeHtml((safeTrend.platforms || []).join(" · "))}</p>
      <p class="detail-description">${escapeHtml(safeTrend.description)}</p>
    </article>
  `;

  const backButton = document.getElementById("backButton");
  if (backButton) {
    backButton.addEventListener("click", () => filterTrends());
  }

  const history = await loadHistory(safeTrend.titleKey);
  const historyContainer = document.getElementById("trendHistory");
  if (historyContainer) {
    historyContainer.innerHTML = createHistoryGraph(history);
  }
}

function renderExplore(items) {
  if (!elements.exploreResults) return;

  elements.exploreResults.setAttribute("aria-busy", "false");
  elements.exploreResults.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    elements.exploreResults.innerHTML = `
      <div class="explore-empty">
        <strong>No signals found.</strong>
        <span>Try another search or status filter.</span>
      </div>
    `;
    return;
  }

  items.map(normalizeTrend).forEach((trend, index) => {
    const item = document.createElement("article");
    item.className = "explore-item";
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    const momentum = trend.momentumScore == null ? null : clampNumber(trend.momentumScore, 0, 100);
    const confidence = trend.confidenceScore == null ? null : clampNumber(trend.confidenceScore, 0, 100);
    const statusClass = trend.status.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    item.innerHTML = `
      <div class="explore-card-top">
        <span class="explore-rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="explore-status explore-status-${statusClass}">${escapeHtml(trend.status)}</span>
      </div>
      <div class="explore-card-main">
        <div class="explore-main">
          <h3>${escapeHtml(trend.title)}</h3>
          <p>${escapeHtml((trend.platforms || []).join(" · "))} <span>·</span> ${regionLabel(trend.regions.length)}</p>
        </div>
        <div class="explore-growth">
          <strong>${escapeHtml(displayValue(trend.growth))}</strong>
          <span>GROWTH</span>
        </div>
      </div>
      <div class="explore-card-metrics">
        <div>
          <span>GLOBAL SCORE</span>
          <strong>${trend.globalScore}</strong>
        </div>
        <div>
          <span>MOMENTUM</span>
          <strong>${momentum == null ? "—" : momentum}</strong>
        </div>
        <div>
          <span>CONFIDENCE</span>
          <strong>${confidence == null ? "—" : `${confidence}%`}</strong>
        </div>
      </div>
    `;

    item.addEventListener("click", () => openExploreTrend(trend));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openExploreTrend(trend);
      }
    });
    elements.exploreResults.appendChild(item);
  });
}

function filterExplore() {
  if (!elements.exploreInput || !elements.exploreResults || !elements.exploreCount) return;

  const query = elements.exploreInput.value.trim().toLowerCase();

  const filtered = state.trends
    .map(normalizeTrend)
    .filter((trend) => {
      const matchesFilter = state.activeExploreFilter === "all" || trend.status === state.activeExploreFilter;

      const matchesSearch = !query ||
        trend.title.toLowerCase().includes(query) ||
        (trend.description || "").toLowerCase().includes(query) ||
        trend.platforms.some((platform) => platform.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });

  elements.exploreCount.textContent = `${filtered.length} SIGNALS`;
  renderExplore(filtered);
}

async function openExploreTrend(trend) {
  if (!elements.exploreResults) return;

  const safeTrend = normalizeTrend(trend);
  const globalScore = clampNumber(safeTrend.globalScore, 0, 100);
  const momentum = safeTrend.momentumScore == null ? null : clampNumber(safeTrend.momentumScore, 0, 100);
  const confidence = safeTrend.confidenceScore == null ? null : clampNumber(safeTrend.confidenceScore, 0, 100);
  const acceleration = safeTrend.acceleration == null ? null : Number(safeTrend.acceleration);

  elements.exploreResults.innerHTML = `
    <article class="explore-detail">
      <button class="explore-back" id="exploreBack" type="button">← BACK TO EXPLORE</button>
      <p class="eyebrow">SIGNAL</p>
      <h3>${escapeHtml(safeTrend.title)}</h3>

      <div class="explore-detail-meta explore-score-grid">
        <div><span>GLOBAL SCORE</span><strong>${globalScore}</strong></div>
        <div><span>MOMENTUM</span><strong>${momentum == null ? "—" : momentum}</strong></div>
        <div><span>CONFIDENCE</span><strong>${confidence == null ? "—" : `${confidence}%`}</strong></div>
        <div><span>GROWTH</span><strong>${escapeHtml(displayValue(safeTrend.growth))}</strong></div>
      </div>

      <div class="explore-detail-meta explore-dynamics-grid">
        <div><span>VELOCITY</span><strong>${escapeHtml(displayValue(safeTrend.velocity))}</strong></div>
        <div><span>ACCELERATION</span><strong>${acceleration == null ? "—" : acceleration}</strong></div>
        <div><span>STATUS</span><strong>${escapeHtml(safeTrend.status)}</strong></div>
        <div><span>MENTIONS</span><strong>${escapeHtml(safeTrend.mentions)}</strong></div>
        <div><span>SIGNAL</span><strong>${escapeHtml(safeTrend.signal)}</strong></div>
      </div>

      <div class="explore-detail-block">
        <span class="explore-detail-label">SOURCE COVERAGE</span>
        <p class="explore-detail-platforms">${escapeHtml((safeTrend.platforms || []).join(" · "))} · ${safeTrend.regions.length} tracked regions</p>
        <div class="region-list">${safeTrend.regions.map((region) => `<span>${escapeHtml(region.code || region.name)}</span>`).join("")}</div>
      </div>
      <div class="explore-detail-block">
        <span class="explore-detail-label">WHY THIS SIGNAL IS MOVING</span>
        <p class="explore-detail-description">${escapeHtml(safeTrend.description)}</p>
      </div>
      ${createSignalGraph(safeTrend.signalBreakdown)}

      <div id="exploreHistory">
        <div class="signal-graph">
          <div class="graph-head">
            <span>HISTORICAL SIGNAL</span>
            <span>LOADING</span>
          </div>
        </div>
      </div>
    </article>
  `;

  const backButton = document.getElementById("exploreBack");
  if (backButton) {
    backButton.addEventListener("click", () => filterExplore());
  }

  const history = await loadHistory(safeTrend.titleKey);
  const historyContainer = document.getElementById("exploreHistory");
  if (historyContainer) {
    historyContainer.innerHTML = createHistoryGraph(history);
  }
}

if (elements.searchButton) {
  elements.searchButton.addEventListener("click", filterTrends);
}

if (elements.searchInput) {
  elements.searchInput.addEventListener("input", filterTrends);
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      filterTrends();
    }
  });
}

if (elements.platformButtons.length) {
  elements.platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.platformButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activePlatform = button.dataset.platform || "all";
      filterTrends();
    });
  });
}

if (elements.exploreInput) {
  elements.exploreInput.addEventListener("input", filterExplore);
}

if (elements.exploreFilters.length) {
  elements.exploreFilters.forEach((button) => {
    button.addEventListener("click", () => {
      elements.exploreFilters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeExploreFilter = button.dataset.filter || "all";
      filterExplore();
    });
  });
}

async function loadTrends() {
  try {
    const response = await fetch("/api/trends");
    if (!response.ok) throw new Error("Failed to load trends");

    const payload = await response.json();
    const trendList = Array.isArray(payload?.trends) ? payload.trends : [];
    state.trends = trendList.map(normalizeTrend);

    if (elements.trendList) filterTrends();
    if (elements.exploreResults) filterExplore();
  } catch (error) {
    console.error("UNKNOWN API error:", error);

    state.trends = [];

    if (elements.trendList) {
      elements.trendList.innerHTML = `
        <div class="trend">
          <div></div>
          <div class="trend-main">
            <h3>DATA UNAVAILABLE</h3>
            <p>Unable to load live trend signals. Please try again later.</p>
          </div>
          <strong>—</strong>
        </div>
      `;
    }

    if (elements.exploreResults) {
      elements.exploreResults.innerHTML = `
        <div class="explore-empty">
          <strong>DATA UNAVAILABLE</strong>
          <span>Unable to load live trend signals. Please try again later.</span>
        </div>
      `;
    }

    if (elements.exploreCount) {
      elements.exploreCount.textContent = `${state.trends.length} SIGNALS`;
    }
  }
}

loadTrends();
