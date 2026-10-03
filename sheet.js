const list = document.getElementById("trendList");
const search = document.getElementById("searchInput");
const count = document.getElementById("signalCount");
const heroCount = document.getElementById("heroSignalCount");
let signals = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function presentTitle(title) {
  return String(title || "").replace(/\s+match scorecard$/i, "").replace(/\s+/g, " ").trim();
}
function render(items) {
  if (!list) return;
  if (count) count.textContent = String(items.length);
  if (!items.length) {
    list.innerHTML = `<div class="signal-detail"><h2>No signals found</h2><p>Try another search.</p></div>`;
    return;
  }
  list.innerHTML = "";
  items.forEach((signal, index) => {
    const row = document.createElement("button");
    row.className = "signal-row";
    row.type = "button";
    const regions = signal.regions?.length || 0;
    row.innerHTML = `
      <span class="signal-rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="signal-copy"><h3>${escapeHtml(presentTitle(signal.title))}</h3><p>${regions} ${regions === 1 ? "region" : "regions"}</p></span>
      <strong class="signal-score">${signal.globalScore ?? "—"}</strong>
    `;
    row.addEventListener("click", () => openSignal(signal));
    list.appendChild(row);
  });
}
function openSignal(signal) {
  const regions = signal.regions || [];
  list.innerHTML = `
    <article class="signal-detail">
      <button class="back-link" id="backLink" type="button">BACK</button>
      <p class="eyebrow">SIGNAL</p>
      <h2>${escapeHtml(presentTitle(signal.title))}</h2>
      <div class="detail-figures">
        <div><strong>${signal.globalScore ?? "—"}</strong><span>GLOBAL</span></div>
        <div><strong>${regions.length}</strong><span>REGIONS</span></div>
        <div><strong>${escapeHtml(signal.status || "NEW")}</strong><span>STATUS</span></div>
      </div>
      <div class="region-pills">${regions.map((region) => `<i>${escapeHtml(region.code || region.name || "")}</i>`).join("")}</div>
      <p>${escapeHtml(signal.description || "Historical movement appears after the next saved snapshot.")}</p>
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
  if (heroCount) heroCount.textContent = String(signals.length);
  apply();
}
search?.addEventListener("input", apply);
document.getElementById("searchButton")?.addEventListener("click", apply);
load();
