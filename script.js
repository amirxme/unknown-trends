const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const trendList = document.getElementById("trendList");

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
    platforms: "TikTok · Instagram · X",
    growth: "+221%"
  },
  {
    title: "Internet culture",
    platforms: "TikTok · X · Reddit",
    growth: "+187%"
  }
];

function renderTrends(items) {
  trendList.innerHTML = "";

  if (items.length === 0) {
    trendList.innerHTML = `
      <div class="trend">
        <div></div>

        <div class="trend-main">
          <h3>No signals found</h3>
          <p>Try another search.</p>
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

function searchTrends() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderTrends(trends);
    return;
  }

  const results = trends.filter((trend) => {
    return (
      trend.title.toLowerCase().includes(query) ||
      trend.platforms.toLowerCase().includes(query)
    );
  });

  renderTrends(results);
}

searchButton.addEventListener("click", searchTrends);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchTrends();
  }
});

renderTrends(trends);