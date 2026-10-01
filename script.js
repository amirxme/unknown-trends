const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const trendList = document.getElementById("trendList");
const platformButtons = document.querySelectorAll(".platform");

let activePlatform = "all";

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

function createSignalGraph(history) {
  const width = 700;
  const height = 180;
  const padding = 10;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((value, index) => {
    const x =
      padding +
      (index / (history.length - 1)) *
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
        <span>SIGNAL MOVEMENT</span>
        <span>LAST 10 PERIODS</span>
      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        aria-label="Signal movement graph"
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
        <span>EARLIER</span>
        <span>NOW</span>
      </div>

    </div>
  `;
}

function openTrend(trend) {
  trendList.innerHTML = `
    <article class="trend-detail">

      <button class="back-button" id="backButton">
        ← BACK TO TRENDS
      </button>

      <p class="eyebrow">SIGNAL</p>

      <h2>${trend.title}</h2>

      <div class="detail-meta">

        <span>
          GROWTH
          <strong>${trend.growth}</strong>
        </span>

        <span>
          STATUS
          <strong>${trend.status}</strong>
        </span>

      </div>

      <div class="detail-meta">

        <span>
          MENTIONS
          <strong>${trend.mentions}</strong>
        </span>

        <span>
          VELOCITY
          <strong>${trend.velocity}</strong>
        </span>

      </div>

      <div class="detail-meta">

        <span>
          PLATFORMS
          <strong>${trend.platformCount}</strong>
        </span>

        <span>
          SIGNAL
          <strong>${trend.signal}</strong>
        </span>

      </div>

      ${createSignalGraph(trend.history)}

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
}

searchButton.addEventListener("click", filterTrends);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    filterTrends();
  }
});

platformButtons.forEach((button) => {
  button.addEventListener("click", () => {

    platformButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    activePlatform = button.dataset.platform;

    filterTrends();
  });
});

renderTrends(trends);