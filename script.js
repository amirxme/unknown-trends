const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const trendList = document.getElementById("trendList");

const platformButtons = document.querySelectorAll(".platform");

const exploreInput = document.getElementById("exploreInput");
const exploreResults = document.getElementById("exploreResults");
const exploreFilters = document.querySelectorAll(".explore-filter");
const exploreCount = document.getElementById("exploreCount");

let trends = [];

let activePlatform = "all";
let activeExploreFilter = "all";


/* =========================
   TRENDING NOW
========================= */

function renderTrends(items) {
  trendList.innerHTML = "";

  if (items.length === 0) {
    trendList.innerHTML = `
      <div class="trend">
        <div></div>

        <div class="trend-main">
          <h3>No signals found</h3>
          <p>Try another search or platform.</p>
        </div>

        <strong>—</strong>
      </div>
    `;

    return;
  }

  items.forEach((trend, index) => {
    const article = document.createElement("article");

    article.className = "trend";

    article.innerHTML = `
      <span class="rank">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <div class="trend-main">
        <h3>${trend.title}</h3>
        <p>${trend.platforms.join(" · ")}</p>
      </div>

      <strong>${trend.growth}</strong>
    `;

    article.addEventListener("click", () => {
      openTrend(trend);
    });

    trendList.appendChild(article);
  });
}


function filterTrends() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = trends.filter((trend) => {
    const matchesPlatform =
      activePlatform === "all" ||
      trend.platforms.some(
        (platform) =>
          platform.toLowerCase() === activePlatform.toLowerCase()
      );

    const matchesSearch =
      !query ||
      trend.title.toLowerCase().includes(query) ||
      trend.platforms.some(
        (platform) =>
          platform.toLowerCase().includes(query)
      );

    return matchesPlatform && matchesSearch;
  });

  renderTrends(filtered);
}


/* =========================
   SIGNAL GRAPH
========================= */

function createSignalGraph(signalBreakdown) {
  const width = 700;
  const height = 180;
  const padding = 10;

  const values = signalBreakdown || [0, 0, 0, 0];

  const min = 0;
  const max = 100;
  const range = max - min;

  const points = values.map((value, index) => {
    const x =
      padding +
      (index / (values.length - 1)) *
        (width - padding * 2);

    const y =
      height -
      padding -
      ((value - min) / range) *
        (height - padding * 2);

    return `${x},${y}`;
  });

  return `
    <div class="signal-graph">

      <div class="graph-head">
        <span>SIGNAL COMPOSITION</span>
        <span>0 — 100</span>
      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        aria-label="Signal composition graph"
      >

        <line
          x1="0"
          y1="25%"
          x2="${width}"
          y2="25%"
          class="graph-grid"
        />

        <line
          x1="0"
          y1="50%"
          x2="${width}"
          y2="50%"
          class="graph-grid"
        />

        <line
          x1="0"
          y1="75%"
          x2="${width}"
          y2="75%"
          class="graph-grid"
        />

        <polyline
          points="${points.join(" ")}"
          class="graph-line"
        />

      </svg>

      <div class="graph-labels">
        <span>COVERAGE</span>
        <span>VOLUME</span>
        <span>POSITION</span>
        <span>SIGNAL</span>
      </div>

    </div>
  `;
}


/* =========================
   HISTORICAL SIGNAL GRAPH
========================= */

function createHistoryGraph(history) {
  if (!history || history.length === 0) {
    return `
      <div class="signal-graph">
        <div class="graph-head">
          <span>HISTORICAL SIGNAL</span>
          <span>NO DATA</span>
        </div>

        <p style="margin:16px 0 0; opacity:.55;">
          Historical snapshots will appear here as the system collects them.
        </p>
      </div>
    `;
  }

  const width = 700;
  const height = 180;
  const padding = 10;

  const values = history.map((item) =>
    Number(item.global_score) || 0
  );

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : padding +
          (index / (values.length - 1)) *
            (width - padding * 2);

    const y =
      height -
      padding -
      (value / 100) *
        (height - padding * 2);

    return `${x},${y}`;
  });

  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;

  const changeLabel =
    change > 0
      ? `+${change}`
      : `${change}`;

  const timestamps = history.map((item) =>
    new Date(item.captured_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  );

  return `
    <div class="signal-graph">

      <div class="graph-head">
        <span>HISTORICAL SIGNAL</span>
        <span>${changeLabel} SCORE</span>
      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        aria-label="Historical signal graph"
      >

        <line
          x1="0"
          y1="25%"
          x2="${width}"
          y2="25%"
          class="graph-grid"
        />

        <line
          x1="0"
          y1="50%"
          x2="${width}"
          y2="50%"
          class="graph-grid"
        />

        <line
          x1="0"
          y1="75%"
          x2="${width}"
          y2="75%"
          class="graph-grid"
        />

        <polyline
          points="${points.join(" ")}"
          class="graph-line"
        />

      </svg>

      <div class="graph-labels">
        <span>${timestamps[0]}</span>
        <span>${timestamps[Math.floor(timestamps.length / 2)] || ""}</span>
        <span>${timestamps[timestamps.length - 1]}</span>
      </div>

    </div>
  `;
}


/* =========================
   LOAD HISTORY
========================= */

async function loadHistory(title) {
  try {
    const response = await fetch(
      `/api/history?title=${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      throw new Error("Failed to load history");
    }

    const data = await response.json();

    return data.history || [];
  } catch (error) {
    console.error("UNKNOWN history error:", error);
    return [];
  }
}


/* =========================
   TREND DETAIL
========================= */

async function openTrend(trend) {
  trendList.innerHTML = `
    <article class="trend-detail">

      <button class="back-button" id="backButton">
        ← BACK TO TRENDS
      </button>

      <p class="eyebrow">SIGNAL</p>

      <h2>${trend.title}</h2>

            <div class="detail-meta">

        <span>
          SCORE
          <strong>${trend.growth}</strong>
        </span>

        <span>
          MOMENTUM
          <strong>${trend.momentumScore}/100</strong>
        </span>

      </div>

      <div class="detail-meta">

        <span>
          STATUS
          <strong>${trend.status}</strong>
        </span>

        <span>
          VELOCITY
          <strong>${trend.velocity}</strong>
        </span>

      </div>

      <div class="detail-meta">

        <span>
          MENTIONS
          <strong>${trend.mentions}</strong>
        </span>

        <span>
          SIGNAL
          <strong>${trend.signal}</strong>
        </span>

      </div>

      ${createSignalGraph(trend.signalBreakdown)}

      <div id="trendHistory">

        <div class="signal-graph">
          <div class="graph-head">
            <span>HISTORICAL SIGNAL</span>
            <span>LOADING</span>
          </div>
        </div>

      </div>

      <p class="detail-platforms">
        ${trend.platforms.join(" · ")}
      </p>

      <p class="detail-description">
        ${trend.description}
      </p>

    </article>
  `;

  document
    .getElementById("backButton")
    .addEventListener("click", () => {
      filterTrends();
    });

  const history = await loadHistory(trend.title);

  const historyContainer =
    document.getElementById("trendHistory");

  if (historyContainer) {
    historyContainer.innerHTML =
      createHistoryGraph(history);
  }
}


/* =========================
   EXPLORE
========================= */

function renderExplore(items) {
  exploreResults.innerHTML = "";

  if (items.length === 0) {
    exploreResults.innerHTML = `
      <div class="explore-empty">
        <strong>No signals found.</strong>
        <span>Try another search or platform.</span>
      </div>
    `;

    return;
  }

  items.forEach((trend, index) => {
    const item = document.createElement("article");

    item.className = "explore-item";

    item.innerHTML = `
      <span class="explore-rank">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <div class="explore-main">

        <h3>${trend.title}</h3>

        <p>
          ${trend.platforms.join(" · ")}
        </p>

        <span class="explore-platform-count">
          ${trend.platformCount} PLATFORMS
        </span>

      </div>

      <div class="explore-growth">
        <strong>${trend.growth}</strong>
        <span>${trend.status}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      openExploreTrend(trend);
    });

    exploreResults.appendChild(item);
  });
}


function filterExplore() {
  const query =
    exploreInput.value.trim().toLowerCase();

  const filtered = trends.filter((trend) => {

    const matchesFilter =
      activeExploreFilter === "all" ||
      trend.platforms.some(
        (platform) =>
          platform.toLowerCase() ===
          activeExploreFilter.toLowerCase()
      );

    const matchesSearch =
      !query ||
      trend.title.toLowerCase().includes(query) ||
      trend.description.toLowerCase().includes(query) ||
      trend.platforms.some(
        (platform) =>
          platform.toLowerCase().includes(query)
      );

    return matchesFilter && matchesSearch;
  });

  exploreCount.textContent =
    `${filtered.length} SIGNALS`;

  renderExplore(filtered);
}


async function openExploreTrend(trend) {
  exploreResults.innerHTML = `
    <article class="explore-detail">

      <button class="explore-back" id="exploreBack">
        ← BACK TO EXPLORE
      </button>

      <p class="eyebrow">SIGNAL</p>

      <h3>${trend.title}</h3>

      <div class="explore-detail-meta">

        <div>
          <span>GROWTH</span>
          <strong>${trend.growth}</strong>
        </div>

        <div>
          <span>STATUS</span>
          <strong>${trend.status}</strong>
        </div>

        <div>
          <span>MENTIONS</span>
          <strong>${trend.mentions}</strong>
        </div>

        <div>
          <span>VELOCITY</span>
          <strong>${trend.velocity}</strong>
        </div>

        <div>
          <span>PLATFORMS</span>
          <strong>${trend.platformCount}</strong>
        </div>

        <div>
          <span>SIGNAL</span>
          <strong>${trend.signal}</strong>
        </div>

      </div>

      <p class="explore-detail-platforms">
        ${trend.platforms.join(" · ")}
      </p>

      <p class="explore-detail-description">
        ${trend.description}
      </p>

      ${createSignalGraph(trend.signalBreakdown)}

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

  document
    .getElementById("exploreBack")
    .addEventListener("click", () => {
      filterExplore();
    });

  const history = await loadHistory(trend.title);

  const historyContainer =
    document.getElementById("exploreHistory");

  if (historyContainer) {
    historyContainer.innerHTML =
      createHistoryGraph(history);
  }
}


/* =========================
   EVENTS
========================= */

searchButton.addEventListener(
  "click",
  filterTrends
);

searchInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      filterTrends();
    }
  }
);


platformButtons.forEach((button) => {

  button.addEventListener("click", () => {

    platformButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    activePlatform =
      button.dataset.platform;

    filterTrends();
  });

});


if (exploreInput) {

  exploreInput.addEventListener(
    "input",
    () => {
      filterExplore();
    }
  );

}


exploreFilters.forEach((button) => {

  button.addEventListener("click", () => {

    exploreFilters.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    activeExploreFilter =
      button.dataset.filter;

    filterExplore();
  });

});


/* =========================
   API
========================= */

async function loadTrends() {

  try {

    const response =
      await fetch("/api/trends");

    if (!response.ok) {
      throw new Error(
        "Failed to load trends"
      );
    }

    const data =
      await response.json();

    trends =
      data.trends || [];

    filterTrends();
    filterExplore();

  } catch (error) {

    console.error(
      "UNKNOWN API error:",
      error
    );

  }

}

loadTrends();