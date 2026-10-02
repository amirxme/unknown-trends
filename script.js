const searchInput =
  document.getElementById("searchInput");

const searchButton =
  document.getElementById("searchButton");

const trendList =
  document.getElementById("trendList");

const platformButtons =
  document.querySelectorAll(".platform");


const exploreInput =
  document.getElementById("exploreInput");

const exploreResults =
  document.getElementById("exploreResults");

const exploreFilters =
  document.querySelectorAll(".explore-filter");

const exploreCount =
  document.getElementById("exploreCount");


let trends = [];

let activePlatform = "all";
let activeExploreFilter = "all";


/* =========================
   TRENDING NOW
========================= */

function renderTrends(items) {

  if (!trendList) {
    return;
  }

  trendList.innerHTML = "";

  if (items.length === 0) {

    trendList.innerHTML = `
      <div class="trend">

        <div></div>

        <div class="trend-main">

          <h3>
            No signals found
          </h3>

          <p>
            Try another search or platform.
          </p>

        </div>

        <strong>—</strong>

      </div>
    `;

    return;
  }


  const topTrend = items[0];


  const momentum =
    Math.max(
      0,
      Math.min(
        100,
        Number(topTrend.momentumScore) || 0
      )
    );


  const momentumLabel =
    momentum >= 70
      ? "HIGH MOMENTUM"
      : momentum >= 50
        ? "RISING MOMENTUM"
        : "LOW MOMENTUM";


  const momentumIndex =
    document.createElement("section");


  momentumIndex.className =
    "momentum-index";


  momentumIndex.innerHTML = `

    <div class="momentum-index-head">

      <div>

        <p class="eyebrow">
          MOMENTUM INDEX
        </p>

        <h2>
          ${momentum}
          <span>/100</span>
        </h2>

      </div>

      <span class="momentum-index-status">
        ${momentumLabel}
      </span>

    </div>


    <div class="momentum-index-main">

      <div>

        <strong>
          ${topTrend.title}
        </strong>

        <span>
          ${topTrend.status}
          ·
          ${topTrend.velocity}
        </span>

      </div>


      <div class="momentum-index-bar">

        <div
          class="momentum-index-fill"
          style="width: ${momentum}%"
        ></div>

      </div>

    </div>

  `;


  momentumIndex.addEventListener(
    "click",
    () => {
      openTrend(topTrend);
    }
  );


  trendList.appendChild(
    momentumIndex
  );


  const ranking =
    document.createElement("section");


  ranking.className =
    "momentum-ranking";


  ranking.innerHTML = `

    <div class="momentum-ranking-head">

      <p class="eyebrow">
        MOMENTUM RANKING
      </p>

      <span>
        TOP ${Math.min(5, items.length)}
      </span>

    </div>

  `;


  items
    .slice(0, 5)
    .forEach((trend, index) => {

      const row =
        document.createElement("article");


      row.className =
        "momentum-ranking-row";


      const score =
        Math.max(
          0,
          Math.min(
            100,
            Number(trend.momentumScore) || 0
          )
        );


      row.innerHTML = `

        <span class="momentum-ranking-rank">
          ${String(index + 1).padStart(2, "0")}
        </span>


        <div class="momentum-ranking-main">

          <strong>
            ${trend.title}
          </strong>

          <span>
            ${trend.status}
            ·
            ${trend.velocity}
          </span>

        </div>


        <strong class="momentum-ranking-score">
          ${score}
        </strong>

      `;


      row.addEventListener(
        "click",
        () => {
          openTrend(trend);
        }
      );


      ranking.appendChild(row);

    });


  trendList.appendChild(
    ranking
  );


  items.forEach((trend, index) => {

    const article =
      document.createElement("article");


    article.className =
      "trend";


    article.innerHTML = `

      <span class="rank">
        ${String(index + 1).padStart(2, "0")}
      </span>


      <div class="trend-main">

        <h3>
          ${trend.title}
        </h3>

        <p>
          ${trend.platforms.join(" · ")}
        </p>

      </div>


      <strong>
        ${trend.growth}
      </strong>

    `;


    article.addEventListener(
      "click",
      () => {
        openTrend(trend);
      }
    );


    trendList.appendChild(
      article
    );

  });

}


/* =========================
   FILTER TRENDS
========================= */

function filterTrends() {

  if (!trendList) {
    return;
  }


  const query =
    searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";


  const filtered =
    trends.filter((trend) => {

      const matchesPlatform =
        activePlatform === "all" ||
        trend.platforms.some(
          (platform) =>
            platform.toLowerCase() ===
            activePlatform.toLowerCase()
        );


      const matchesSearch =
        !query ||
        trend.title
          .toLowerCase()
          .includes(query) ||
        trend.platforms.some(
          (platform) =>
            platform
              .toLowerCase()
              .includes(query)
        );


      return (
        matchesPlatform &&
        matchesSearch
      );

    });


  renderTrends(filtered);


  const emergingList =
    document.getElementById(
      "emergingList"
    );


  if (!emergingList) {
    return;
  }


  const emergingItems =
    [...filtered]
      .sort(
        (a, b) =>
          (Number(b.emergingScore) || 0) -
          (Number(a.emergingScore) || 0)
      )
      .filter(
        (trend) =>
          Number(trend.emergingScore) > 0
      )
      .slice(0, 5);


  emergingList.innerHTML = "";


  if (emergingItems.length === 0) {

    emergingList.innerHTML = `
      <div class="trend">

        <div></div>

        <div class="trend-main">

          <h3>
            No emerging signals yet
          </h3>

          <p>
            The system is waiting for early movement.
          </p>

        </div>

        <strong>—</strong>

      </div>
    `;

    return;
  }


  emergingItems.forEach(
    (trend, index) => {

      const article =
        document.createElement(
          "article"
        );


      article.className =
        "trend";


      const emergingScore =
        Math.max(
          0,
          Math.min(
            100,
            Number(trend.emergingScore) || 0
          )
        );


      article.innerHTML = `

        <span class="rank">
          ${String(index + 1).padStart(2, "0")}
        </span>


        <div class="trend-main">

          <h3>
            ${trend.title}
          </h3>

          <p>
            ${trend.status}
            ·
            ${trend.velocity}
          </p>

        </div>


        <strong>
          ${emergingScore}
        </strong>

      `;


      article.addEventListener(
        "click",
        () => {
          openTrend(trend);
        }
      );


      emergingList.appendChild(
        article
      );

    }
  );

}


/* =========================
   SIGNAL GRAPH
========================= */

function createSignalGraph(
  signalBreakdown
) {

  const width = 700;
  const height = 180;
  const padding = 10;


  const values =
    signalBreakdown ||
    [0, 0, 0, 0];


  const min = 0;
  const max = 100;
  const range = max - min;


  const points =
    values.map((value, index) => {

      const x =
        values.length === 1
          ? width / 2
          : padding +
            (index /
              (values.length - 1)) *
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

        <span>
          SIGNAL COMPOSITION
        </span>

        <span>
          0 — 100
        </span>

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

        <span>
          COVERAGE
        </span>

        <span>
          VOLUME
        </span>

        <span>
          POSITION
        </span>

        <span>
          SIGNAL
        </span>

      </div>

    </div>

  `;
}


/* =========================
   HISTORICAL SIGNAL GRAPH
========================= */

function createHistoryGraph(
  history
) {

  if (
    !history ||
    history.length === 0
  ) {

    return `

      <div class="signal-graph">

        <div class="graph-head">

          <span>
            HISTORICAL SIGNAL
          </span>

          <span>
            NO DATA
          </span>

        </div>


        <p
          style="margin:16px 0 0; opacity:.55;"
        >
          Historical snapshots will appear here
          as the system collects them.
        </p>

      </div>

    `;

  }


  const width = 700;
  const height = 180;
  const padding = 10;


  const values =
    history.map(
      (item) =>
        Number(item.global_score) || 0
    );


  const points =
    values.map(
      (value, index) => {

        const x =
          values.length === 1
            ? width / 2
            : padding +
              (index /
                (values.length - 1)) *
              (width - padding * 2);


        const y =
          height -
          padding -
          (value / 100) *
            (height - padding * 2);


        return `${x},${y}`;

      }
    );


  const first =
    values[0];


  const last =
    values[values.length - 1];


  const change =
    last - first;


  const changeLabel =
    change > 0
      ? `+${change}`
      : `${change}`;


  const timestamps =
    history.map(
      (item) =>
        new Date(
          item.captured_at
        ).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )
    );


  return `

    <div class="signal-graph">

      <div class="graph-head">

        <span>
          HISTORICAL SIGNAL
        </span>

        <span>
          ${changeLabel} SCORE
        </span>

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

        <span>
          ${timestamps[0]}
        </span>

        <span>
          ${timestamps[
            Math.floor(
              timestamps.length / 2
            )
          ] || ""}
        </span>

        <span>
          ${timestamps[
            timestamps.length - 1
          ]}
        </span>

      </div>

    </div>

  `;
}


/* =========================
   LOAD HISTORY
========================= */

async function loadHistory(
  title
) {

  try {

    const response =
      await fetch(
        `/api/history?title=${encodeURIComponent(title)}`
      );


    if (!response.ok) {
      throw new Error(
        "Failed to load history"
      );
    }


    const data =
      await response.json();


    return data.history || [];

  } catch (error) {

    console.error(
      "UNKNOWN history error:",
      error
    );


    return [];

  }

}


/* =========================
   TREND DETAIL
========================= */

async function openTrend(
  trend
) {

  if (!trendList) {
    return;
  }


  const confidence =
    Math.max(
      0,
      Math.min(
        100,
        Number(trend.confidenceScore) || 0
      )
    );


  const momentum =
    Math.max(
      0,
      Math.min(
        100,
        Number(trend.momentumScore) || 0
      )
    );


  let confidenceLabel =
    "LOW CONFIDENCE";


  if (confidence >= 75) {

    confidenceLabel =
      "HIGH CONFIDENCE";

  } else if (confidence >= 50) {

    confidenceLabel =
      "MEDIUM CONFIDENCE";

  }


  trendList.innerHTML = `

    <article class="trend-detail">

      <button
        class="back-button"
        id="backButton"
      >
        ← BACK TO TRENDS
      </button>


      <p class="eyebrow">
        SIGNAL
      </p>


      <h2>
        ${trend.title}
      </h2>


        <div class="detail-meta">

    <span>

      SCORE

      <strong>
        ${trend.growth}
      </strong>

    </span>


    <span>

      MOMENTUM

      <strong>
        ${momentum}/100
      </strong>


      <div class="momentum-meter">

        <div
          class="momentum-meter-fill"
          style="width: ${momentum}%"
        ></div>

      </div>


      <small class="momentum-status">
        ${trend.status}
      </small>

    </span>

  </div>


  <div class="detail-meta">

    <span>

      EMERGING SCORE

      <strong>
        ${Math.max(
          0,
          Math.min(
            100,
            Number(trend.emergingScore) || 0
          )
        )}/100
      </strong>

    </span>


    <span>

      WHY EMERGING

      <strong>
        ${trend.velocity}
      </strong>

      <small class="momentum-status">
        VELOCITY · ACCELERATION · MOMENTUM · EARLY SIGNAL
      </small>

    </span>

  </div>


      <div class="detail-meta">

        <span>

          CONFIDENCE

          <strong>
            ${confidence}%
          </strong>


          <div class="momentum-meter">

            <div
              class="momentum-meter-fill"
              style="width: ${confidence}%"
            ></div>

          </div>


          <small class="momentum-status">

            ${confidenceLabel}
            ·
            ${trend.historyCount}
            HISTORICAL SNAPSHOT${trend.historyCount === 1 ? "" : "S"}

          </small>

        </span>


        <span>

          STATUS

          <strong>
            ${trend.status}
          </strong>

        </span>

      </div>


      <div class="detail-meta">

        <span>

          VELOCITY

          <strong>
            ${trend.velocity}
          </strong>

        </span>


        <span>

          MENTIONS

          <strong>
            ${trend.mentions}
          </strong>

        </span>

      </div>


      <div class="detail-meta">

        <span>

          SIGNAL

          <strong>
            ${trend.signal}
          </strong>

        </span>


        <span>

          HISTORY

          <strong>
            ${trend.historyCount}
          </strong>

        </span>

      </div>


      ${createSignalGraph(
        trend.signalBreakdown
      )}


      <div id="trendHistory">

        <div class="signal-graph">

          <div class="graph-head">

            <span>
              HISTORICAL SIGNAL
            </span>

            <span>
              LOADING
            </span>

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


  const backButton =
    document.getElementById(
      "backButton"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      () => {
        filterTrends();
      }
    );

  }


  const history =
    await loadHistory(
      trend.title
    );


  const historyContainer =
    document.getElementById(
      "trendHistory"
    );


  if (historyContainer) {

    historyContainer.innerHTML =
      createHistoryGraph(history);

  }

}


/* =========================
   EXPLORE
========================= */

function renderExplore(
  items
) {

  if (!exploreResults) {
    return;
  }


  exploreResults.innerHTML =
    "";


  if (items.length === 0) {

    exploreResults.innerHTML = `

      <div class="explore-empty">

        <strong>
          No signals found.
        </strong>

        <span>
          Try another search or platform.
        </span>

      </div>

    `;

    return;

  }


  items.forEach(
    (trend, index) => {

      const item =
        document.createElement(
          "article"
        );


      item.className =
        "explore-item";


      const momentum =
        Math.max(
          0,
          Math.min(
            100,
            Number(trend.momentumScore) || 0
          )
        );


      const confidence =
        Math.max(
          0,
          Math.min(
            100,
            Number(trend.confidenceScore) || 0
          )
        );


      item.innerHTML = `

        <span class="explore-rank">
          ${String(index + 1).padStart(2, "0")}
        </span>


        <div class="explore-main">

          <h3>
            ${trend.title}
          </h3>


          <p>
            ${trend.platforms.join(" · ")}
          </p>


          <span class="explore-platform-count">
            ${trend.platformCount} PLATFORMS
          </span>

        </div>


        <div class="explore-growth">

          <strong>
            ${trend.growth}
          </strong>

          <span>
            ${trend.status}
          </span>

        </div>


        <div class="explore-signal-meta">

          <div>

            <span>
              MOMENTUM
            </span>

            <strong>
              ${momentum}
            </strong>

          </div>


          <div>

            <span>
              CONFIDENCE
            </span>

            <strong>
              ${confidence}%
            </strong>

          </div>

        </div>

      `;


      item.addEventListener(
        "click",
        () => {
          openExploreTrend(trend);
        }
      );


      exploreResults.appendChild(
        item
      );

    }
  );

}


/* =========================
   FILTER EXPLORE
========================= */

function filterExplore() {

  if (
    !exploreInput ||
    !exploreResults ||
    !exploreCount
  ) {
    return;
  }


  const query =
    exploreInput.value
      .trim()
      .toLowerCase();


  const filtered =
    trends.filter(
      (trend) => {

        const matchesFilter =
          activeExploreFilter === "all" ||
          trend.platforms.some(
            (platform) =>
              platform
                .toLowerCase() ===
              activeExploreFilter
                .toLowerCase()
          );


        const matchesSearch =
          !query ||
          trend.title
            .toLowerCase()
            .includes(query) ||
          trend.description
            .toLowerCase()
            .includes(query) ||
          trend.platforms.some(
            (platform) =>
              platform
                .toLowerCase()
                .includes(query)
          );


        return (
          matchesFilter &&
          matchesSearch
        );

      }
    );


  exploreCount.textContent =
    `${filtered.length} SIGNALS`;


  renderExplore(
    filtered
  );

}


/* =========================
   EXPLORE DETAIL
========================= */

async function openExploreTrend(
  trend
) {

  if (!exploreResults) {
    return;
  }


  const globalScore =
    Math.max(
      0,
      Math.min(
        100,
        Number(trend.globalScore) || 0
      )
    );


  const momentum =
    Math.max(
      0,
      Math.min(
        100,
        Number(trend.momentumScore) || 0
      )
    );


  const confidence =
    Math.max(
      0,
      Math.min(
        100,
        Number(trend.confidenceScore) || 0
      )
    );


  const acceleration =
    Number(trend.acceleration) || 0;


  exploreResults.innerHTML = `

    <article class="explore-detail">

      <button
        class="explore-back"
        id="exploreBack"
      >
        ← BACK TO EXPLORE
      </button>


      <p class="eyebrow">
        SIGNAL
      </p>


      <h3>
        ${trend.title}
      </h3>


      <div class="explore-detail-meta">

        <div>

          <span>
            GLOBAL SCORE
          </span>

          <strong>
            ${globalScore}
          </strong>

        </div>


        <div>

          <span>
            MOMENTUM
          </span>

          <strong>
            ${momentum}
          </strong>

        </div>


        <div>

          <span>
            CONFIDENCE
          </span>

          <strong>
            ${confidence}%
          </strong>

        </div>


        <div>

          <span>
            ACCELERATION
          </span>

          <strong>
            ${acceleration}
          </strong>

        </div>


        <div>

          <span>
            GROWTH
          </span>

          <strong>
            ${trend.growth}
          </strong>

        </div>


        <div>

          <span>
            STATUS
          </span>

          <strong>
            ${trend.status}
          </strong>

        </div>


        <div>

          <span>
            MENTIONS
          </span>

          <strong>
            ${trend.mentions}
          </strong>

        </div>


        <div>

          <span>
            VELOCITY
          </span>

          <strong>
            ${trend.velocity}
          </strong>

        </div>


        <div>

          <span>
            PLATFORMS
          </span>

          <strong>
            ${trend.platformCount}
          </strong>

        </div>


        <div>

          <span>
            SIGNAL
          </span>

          <strong>
            ${trend.signal}
          </strong>

        </div>

      </div>


      <p class="explore-detail-platforms">
        ${trend.platforms.join(" · ")}
      </p>


      <p class="explore-detail-description">
        ${trend.description}
      </p>


      ${createSignalGraph(
        trend.signalBreakdown
      )}


      <div id="exploreHistory">

        <div class="signal-graph">

          <div class="graph-head">

            <span>
              HISTORICAL SIGNAL
            </span>

            <span>
              LOADING
            </span>

          </div>

        </div>

      </div>

    </article>

  `;


  const backButton =
    document.getElementById(
      "exploreBack"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      () => {
        filterExplore();
      }
    );

  }


  const history =
    await loadHistory(
      trend.title
    );


  const historyContainer =
    document.getElementById(
      "exploreHistory"
    );


  if (historyContainer) {

    historyContainer.innerHTML =
      createHistoryGraph(history);

  }

}


/* =========================
   EVENTS — TRENDS
========================= */

if (searchButton) {

  searchButton.addEventListener(
    "click",
    filterTrends
  );

}


if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {
        filterTrends();
      }

    }
  );

}


platformButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        platformButtons.forEach(
          (item) => {
            item.classList.remove(
              "active"
            );
          }
        );


        button.classList.add(
          "active"
        );


        activePlatform =
          button.dataset.platform;


        filterTrends();

      }
    );

  }
);


/* =========================
   EVENTS — EXPLORE
========================= */

if (exploreInput) {

  exploreInput.addEventListener(
    "input",
    () => {
      filterExplore();
    }
  );

}


exploreFilters.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        exploreFilters.forEach(
          (item) => {
            item.classList.remove(
              "active"
            );
          }
        );


        button.classList.add(
          "active"
        );


        activeExploreFilter =
          button.dataset.filter;


        filterExplore();

      }
    );

  }
);


/* =========================
   API
========================= */

async function loadTrends() {

  try {

    const response =
      await fetch(
        "/api/trends"
      );


    if (!response.ok) {

      throw new Error(
        "Failed to load trends"
      );

    }


    const data =
      await response.json();


    trends =
      data.trends || [];


    if (trendList) {
      filterTrends();
    }


    if (exploreResults) {
      filterExplore();
    }


  } catch (error) {

    console.error(
      "UNKNOWN API error:",
      error
    );

  }

}


loadTrends();