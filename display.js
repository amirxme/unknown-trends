function polishEmptySignals() {
  document.querySelectorAll(".momentum-index").forEach((block) => {
    const heading = block.querySelector("h2");
    const status = block.querySelector(".momentum-index-status");
    if (!heading || !status) return;
    if (!heading.textContent.trim().startsWith("0") || !status.textContent.includes("LOW MOMENTUM")) return;
    heading.textContent = "\u2014";
    status.textContent = "HISTORY COLLECTING";
    const detail = block.querySelector(".momentum-index-main span");
    if (detail) detail.textContent = "Historical data is being collected";
    block.querySelector(".momentum-index-bar")?.remove();
  });

  document.querySelectorAll(".momentum-ranking").forEach((ranking) => {
    const scores = [...ranking.querySelectorAll(".momentum-ranking-score")];
    if (!scores.length || scores.some((score) => score.textContent.trim() !== "0")) return;
    const label = ranking.querySelector(".eyebrow");
    if (label) label.textContent = "TOP SIGNALS";
    ranking.querySelectorAll(".momentum-ranking-row").forEach((row) => {
      const title = row.querySelector("strong")?.textContent?.trim();
      const card = [...document.querySelectorAll(".trend h3")].find((heading) => heading.textContent.trim() === title);
      const global = card?.closest(".trend")?.querySelector(".trend-card-metrics strong")?.textContent;
      const score = row.querySelector(".momentum-ranking-score");
      const meta = row.querySelector(".momentum-ranking-main span");
      if (score && global) score.textContent = global;
      if (meta) meta.textContent = meta.textContent.replace(/\u00b7.*/, `\u00b7 GLOBAL ${global || "\u2014"}`);
    });
  });

  document.querySelectorAll(".trend-empty p, .explore-empty span").forEach((node) => {
    if (node.textContent.toLowerCase().includes("platform")) {
      node.textContent = "Try another search. Status labels need a saved snapshot.";
    }
  });
}

let polishPasses = 0;
const polishTimer = setInterval(() => {
  polishEmptySignals();
  if (++polishPasses > 8) clearInterval(polishTimer);
}, 600);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!target || !target.value || !target.value.trim()) return;
  if (target.id === "searchInput") document.querySelector(".platform[data-platform=\"all\"]")?.click();
  if (target.id === "exploreInput") document.querySelector(".explore-filter[data-filter=\"all\"]")?.click();
});

document.addEventListener("click", () => setTimeout(polishEmptySignals, 40));
