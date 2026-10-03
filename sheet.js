const list = document.getElementById("trendList");
const search = document.getElementById("searchInput");
const toolbar = document.getElementById("listToolbar");
const heroCount = document.getElementById("heroSignalCount");
let signals = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
function presentTitle(title) {
  return String(title || "").replace(/\s+match scorecard$/i, "").replace(/\s+/g, " ").trim();
}
function setDetailMode(on) {
  toolbar?.classList.toggle("is-hidden", on);
}
function render(items) {
  if (!list) return;
  setDetailMode(false);
  if (!items.length) {
    list.innerHTML = `<div class="explore-empty"><strong>No signals</strong><span>Try another search.</span></div>`;
    return;
  }
  list.innerHTML = "";
  items.forEach((signal, index) => {
    const row = document.createElement("button");
    row.className = "signal-row";
    row.type = "button";
    const score = Number(signal.globalScore) || 0;
    row.innerHTML = `
      <span class="signal-rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="signal-copy"><h3>${escapeHtml(presentTitle(signal.title))}</h3></span>
      <span class="signal-score"><b>${score}</b></span>
    `;
    row.addEventListener("click", () => openSignal(signal));
    list.appendChild(row);
  });
}
function openSignal(signal) {
  const regions = signal.regions || [];
  const score = Number(signal.globalScore) || 0;
  setDetailMode(true);
  window.scrollTo(0, 0);
  list.innerHTML = `
    <article class="signal-card">
      <button class="back-link" id="backLink" type="button">Back</button>
      <p class="eyebrow">Signal</p>
      <h2>${escapeHtml(presentTitle(signal.title))}</h2>
      <div class="score-line">
        <div><strong>${score}</strong><span>SCORE</span></div>
        <div><strong>${regions.length}</strong><span>REGIONS</span></div>
        <div><strong>${escapeHtml(signal.status || "NEW")}</strong><span>STATUS</span></div>
      </div>
      <div class="region-pills">${regions.map((region) => `<i>${escapeHtml(region.code || region.name || "")}</i>`).join("")}</div>
      <p class="note">${escapeHtml(signal.description || "Movement appears after the next saved snapshot.")}</p>
    </article>
  `;
  document.getElementById("backLink")?.addEventListener("click", apply);
}
function apply() {
  const query = search?.value.trim().toLowerCase() || "";
  render(signals.filter((signal) => !query || String(signal.title).toLowerCase().includes(query)));
}
async function load() {
  const response = await fetch("/api/trends");
  const payload = await response.json();
  signals = Array.isArray(payload.trends) ? payload.trends : [];
  if (heroCount) heroCount.textContent = `${signals.length} signals`;
  apply();
}
search?.addEventListener("input", apply);
load();
