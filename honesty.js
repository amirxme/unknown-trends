function applySignalHonesty() {
  document.querySelectorAll(".momentum-index").forEach((block) => {
    const status = block.querySelector(".momentum-index-status");
    const heading = block.querySelector("h2");
    if (!status || !heading) return;
    const value = heading.textContent.trim();
    const collecting = value.startsWith("0") || value.startsWith("—") || status.textContent.includes("LOW MOMENTUM") || status.textContent.includes("HISTORY COLLECTING");
    if (!collecting) return;
    heading.textContent = "—";
    status.textContent = "HISTORY COLLECTING";
    const detail = block.querySelector(".momentum-index-main span");
    if (detail) detail.textContent = "Historical data is being collected";
    block.classList.add("is-collecting");
  });

  document.querySelectorAll(".momentum-ranking").forEach((ranking) => {
    const scores = [...ranking.querySelectorAll(".momentum-ranking-score")];
    const empty = scores.length === 0 || scores.every((score) => ["0", "—", "-"].includes(score.textContent.trim()));
    ranking.classList.toggle("is-empty", empty);
    scores.forEach((score) => {
      if (score.textContent.trim() === "0") score.textContent = "—";
    });
  });

  document.querySelectorAll(".trend-growth strong, .explore-growth strong").forEach((value) => {
    if (value.textContent.trim() !== "—") return;
    value.textContent = "COLLECTING";
    const label = value.parentElement?.querySelector("span");
    if (label && label.textContent.trim() === "GROWTH") label.textContent = "STATUS";
  });

  document.querySelectorAll("#emergingList h3").forEach((heading) => {
    if (!heading.textContent.includes("No emerging signals") && !heading.textContent.includes("History is still being collected")) return;
    heading.textContent = "History is still being collected";
    const note = heading.parentElement?.querySelector("p");
    if (note) note.textContent = "Rising and breakout labels appear after the next saved snapshot.";
  });
}

const honestyObserver = new MutationObserver(() => applySignalHonesty());
honestyObserver.observe(document.body, { childList: true, subtree: true });
applySignalHonesty();
