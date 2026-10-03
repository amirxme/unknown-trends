function applySignalHonesty() {
  document.querySelectorAll(".momentum-index-status").forEach((status) => {
    const heading = status.closest(".momentum-index")?.querySelector("h2");
    if (!heading) return;
    const value = heading.textContent.trim();
    if (value.startsWith("0") && status.textContent.includes("LOW MOMENTUM")) {
      heading.textContent = "—";
      status.textContent = "HISTORY COLLECTING";
      const detail = status.closest(".momentum-index")?.querySelector(".momentum-index-main span");
      if (detail) detail.textContent = "Historical data is being collected";
    }
  });

  document.querySelectorAll(".momentum-ranking-score").forEach((score) => {
    if (score.textContent.trim() === "0") score.textContent = "—";
  });

  document.querySelectorAll(".trend-growth strong, .explore-growth strong").forEach((value) => {
    if (value.textContent.trim() !== "—") return;
    value.textContent = "COLLECTING";
    const label = value.parentElement?.querySelector("span");
    if (label && label.textContent.trim() === "GROWTH") label.textContent = "STATUS";
  });

  document.querySelectorAll("#emergingList h3").forEach((heading) => {
    if (heading.textContent.includes("No emerging signals")) {
      heading.textContent = "History is still being collected";
      const note = heading.parentElement?.querySelector("p");
      if (note) note.textContent = "Rising and breakout labels appear after the next saved snapshot.";
    }
  });
}

const honestyObserver = new MutationObserver(() => applySignalHonesty());
honestyObserver.observe(document.body, { childList: true, subtree: true });
applySignalHonesty();
