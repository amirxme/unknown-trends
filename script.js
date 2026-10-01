const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const trendList = document.getElementById("trendList");
const platformButtons = document.querySelectorAll(".platform");

const trends = [
  {
    title: "AI agents",
    platforms: "X · Reddit · YouTube",
    growth: "+428%"
  },
  {
    title: "New iPhone rumors",
    platforms: "X · TikTok · Reddit",
    growth: "+316%"
  },
  {
    title: "Crypto regulation",
    platforms: "X · Reddit",
    growth: "+274%"
  },
  {
    title: "Streetwear revival",
    platforms: "TikTok · X",
    growth: "+221%"
  },
  {
    title: "Internet culture",
    platforms: "TikTok · X · Reddit",
    growth: "+187%"
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
        <p>${trend.platforms}</p>
      </div>

      <strong>${trend.growth}</strong>
    `;

    trendList.appendChild(article);
  });
}

function filterTrends() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = trends.filter((trend) => {

    const matchesPlatform =
      activePlatform === "all" ||
      trend.platforms
        .toLowerCase()
        .includes(activePlatform.toLowerCase());

    const matchesSearch =
      !query ||
      trend.title.toLowerCase().includes(query) ||
      trend.platforms.toLowerCase().includes(query);

    return matchesPlatform && matchesSearch;
  });

  renderTrends(filtered);
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