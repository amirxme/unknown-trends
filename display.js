function quietNoise() {
  document.querySelectorAll(".momentum-index, .momentum-ranking").forEach((block) => {
    const text = block.innerText;
    if (text.includes("HISTORY COLLECTING") || text.includes("TOP SIGNALS") || text.includes("LOW MOMENTUM")) {
      block.remove();
    }
  });

  document.querySelectorAll(".trend-growth, .explore-growth, .trend-card-metrics div, .explore-card-metrics div").forEach((node) => {
    const value = node.querySelector("strong");
    if (value && value.textContent.trim() === "\u2014") node.style.display = "none";
  });

  const statuses = new Set([...document.querySelectorAll(".trend-status, .explore-status")].map((node) => node.textContent.trim()));
  document.querySelectorAll(".platform, .explore-filter").forEach((button) => {
    const key = String(button.dataset.platform || button.dataset.filter || "").toUpperCase();
    if (["RISING", "COOLING", "BREAKOUT"].includes(key) && !statuses.has(key)) button.style.display = "none";
  });
}

let passes = 0;
const timer = setInterval(() => {
  quietNoise();
  if (++passes > 6) clearInterval(timer);
}, 500);
document.addEventListener("click", () => setTimeout(quietNoise, 50));
