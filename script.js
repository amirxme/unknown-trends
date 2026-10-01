const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const trendList = document.getElementById("trendList");
const platformButtons = document.querySelectorAll(".platform");

const trends = [
  {
    title: "AI agents",
    platforms: ["X", "Reddit", "YouTube"],
    growth: "+428%",
    status: "ACCELERATING",
    description: "Growing discussion around autonomous AI systems and agent-based tools."
  },
  {
    title: "New iPhone rumors",
    platforms: ["X", "TikTok", "Reddit"],
    growth: "+316%",
    status: "RISING",
    description: "A rapidly expanding conversation around upcoming Apple hardware."
  },
  {
    title: "Crypto regulation",
    platforms: ["X", "Reddit"],
    growth: "+274%",
    status: "RISING",
    description: "Increasing attention around regulation, policy and the crypto market."
  },
  {
    title: "Streetwear revival",
    platforms: ["TikTok", "X"],
    growth: "+221%",
    status: "EMERGING",
    description: "Renewed interest in streetwear culture, styling and fashion archives."
  },
  {
    title: "Internet culture",
    platforms: ["TikTok", "X", "Reddit"],
    growth: "+187%",
    status: "ACTIVE",
    description: "A broad signal connecting several conversations across internet culture."
  }
];

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
          GROWTH <strong>${trend.growth}</strong>
        </span>

        <span>
          STATUS <strong>${trend.status}</strong>
        </span>

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