// ============================================================
//  ui.js  –  All DOM rendering and interaction
//  Imports game state; never mutates it directly.
// ============================================================

import { RESOURCES, BUILDINGS, CATEGORIES } from "./data.js";
import {
  inventory, owned, nextCost,
  purchaseBuilding, canAfford, isUnlocked,
  getPowerInfo, getProductionRates,
  saveGame, resetGame,
} from "./game.js";

// ── DOM refs ─────────────────────────────────────────────────

let inventoryPanel, buildingsPanel, statsPanel, toastContainer, ticker;

export function initUI() {
  inventoryPanel  = document.getElementById("inventory");
  buildingsPanel  = document.getElementById("buildings");
  statsPanel      = document.getElementById("stats");
  toastContainer  = document.getElementById("toasts");
  ticker          = document.getElementById("ticker-content");

  renderBuildings();
  renderInventory();
  renderStats();
  renderTicker();

  // Save button
  document.getElementById("btn-save").addEventListener("click", () => {
    saveGame();
    showToast("💾 Game saved!", "success");
  });

  // Reset button
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("Reset all progress? This cannot be undone.")) resetGame();
  });
}

// ── Inventory panel ──────────────────────────────────────────

export function renderInventory() {
  if (!inventoryPanel) return;

  inventoryPanel.innerHTML = "";
  for (const [id, res] of Object.entries(RESOURCES)) {
    const amount = inventory[id] ?? 0;
    if (amount === 0 && !isResourceActive(id)) continue; // hide zeroes until relevant

    const el = document.createElement("div");
    el.className = "inv-row";
    el.innerHTML = `
      <span class="inv-icon">${res.icon}</span>
      <span class="inv-name">${res.name}</span>
      <span class="inv-amount" style="color:${res.color}">${fmt(amount)}</span>
    `;
    inventoryPanel.appendChild(el);
  }

  if (inventoryPanel.children.length === 0) {
    inventoryPanel.innerHTML = `<p class="empty-hint">Mine some iron ore to get started.</p>`;
  }
}

/** A resource is "active" if any owned building produces or consumes it. */
function isResourceActive(resId) {
  for (const b of BUILDINGS) {
    if (owned[b.id] === 0) continue;
    if (b.produces[resId] || b.consumes[resId]) return true;
  }
  return resId === "iron_ore"; // always show iron ore
}

// ── Buildings panel ──────────────────────────────────────────

export function renderBuildings() {
  if (!buildingsPanel) return;
  buildingsPanel.innerHTML = "";

  for (const cat of CATEGORIES) {
    const catBuildings = BUILDINGS.filter(b => b.category === cat.id);
    const unlockedOnes = catBuildings.filter(b => isUnlocked(b.id));
    if (unlockedOnes.length === 0) continue;

    // Category header
    const header = document.createElement("div");
    header.className = "cat-header";
    header.textContent = `${cat.icon} ${cat.label}`;
    buildingsPanel.appendChild(header);

    for (const b of unlockedOnes) {
      buildingsPanel.appendChild(buildingCard(b));
    }
  }
}

function buildingCard(b) {
  const card = document.createElement("div");
  card.className = "building-card";
  card.dataset.id = b.id;

  const affordable = canAfford(b.id);
  if (!affordable) card.classList.add("unaffordable");

  const costHtml = Object.entries(nextCost[b.id])
    .map(([res, amt]) => {
      const r = RESOURCES[res];
      const have = inventory[res] ?? 0;
      const ok = have >= amt;
      return `<span class="cost-item ${ok ? "ok" : "bad"}">${r?.icon ?? ""}${fmt(amt)} ${r?.name ?? res}</span>`;
    }).join("");

  const produceHtml = Object.entries(b.produces)
    .map(([res, amt]) => {
      const r = RESOURCES[res];
      return `<span class="flow-item produce">+${amt} ${r?.icon ?? ""} ${r?.name ?? res}</span>`;
    }).join("");

  const consumeHtml = Object.entries(b.consumes)
    .map(([res, amt]) => {
      const r = RESOURCES[res];
      return `<span class="flow-item consume">-${amt} ${r?.icon ?? ""} ${r?.name ?? res}</span>`;
    }).join("");

  const tickSec = (b.baseTickMs / 1000).toFixed(1);

  card.innerHTML = `
    <div class="card-header">
      <span class="card-icon">${b.icon}</span>
      <div class="card-title">
        <strong>${b.name}</strong>
        <span class="card-count">× ${owned[b.id]}</span>
      </div>
    </div>
    <p class="card-desc">${b.description}</p>
    <div class="card-flows">
      ${produceHtml}${consumeHtml}
      ${b.powerDraw > 0 ? `<span class="flow-item power">⚡-${b.powerDraw}/tick</span>` : ""}
    </div>
    <div class="card-footer">
      <div class="card-cost">${costHtml}</div>
      <button class="btn-buy" data-id="${b.id}" ${affordable ? "" : "disabled"}>
        Build (${tickSec}s)
      </button>
    </div>
  `;

  card.querySelector(".btn-buy").addEventListener("click", () => {
    const ok = purchaseBuilding(b.id);
    if (ok) {
      showToast(`${b.icon} Built ${b.name}!`, "success");
    }
  });

  return card;
}

// ── Stats panel ──────────────────────────────────────────────

export function renderStats() {
  if (!statsPanel) return;

  const power   = getPowerInfo();
  const rates   = getProductionRates();
  const total   = Object.values(owned).reduce((a, b) => a + b, 0);

  const activeRates = Object.entries(rates)
    .filter(([, r]) => r !== 0)
    .sort(([, a], [, b]) => b - a);

  statsPanel.innerHTML = `
    <div class="stat-block">
      <div class="stat-label">Buildings</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">⚡ Power</div>
      <div class="stat-value power-val ${power.buffer < 5 && power.consumed > 0 ? "warn" : ""}">
        ${fmt(power.buffer)} buffer
      </div>
      <div class="stat-sub">${power.produced > 0 ? `+${power.produced}` : "0"} gen / ${power.consumed} draw per cycle</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Production / min</div>
      ${activeRates.length === 0
        ? `<div class="stat-sub">No production yet.</div>`
        : activeRates.map(([id, r]) => {
            const res = RESOURCES[id];
            if (!res) return "";
            const sign = r > 0 ? "+" : "";
            return `<div class="rate-row">
              <span>${res.icon} ${res.name}</span>
              <span class="${r > 0 ? "rate-pos" : "rate-neg"}">${sign}${r.toFixed(1)}</span>
            </div>`;
          }).join("")
      }
    </div>
    <div class="stat-block">
      <div class="stat-label">Tech Points</div>
      <div class="stat-value" style="color:#f59e0b">${fmt(inventory.points ?? 0)} 🏆</div>
    </div>
  `;
}

// ── Ticker ───────────────────────────────────────────────────

const TICKER_MSGS = [
  "⛏️ Iron mines operational",
  "🔩 Processing queue running",
  "⚡ Grid stable",
  "📦 Inventory synced",
  "🏭 Factory output nominal",
  "🔶 Copper lines active",
  "⚙️ Gears in motion",
  "💾 Circuits assembled",
];
let tickerIdx = 0;

export function renderTicker() {
  if (!ticker) return;
  ticker.textContent = TICKER_MSGS[tickerIdx % TICKER_MSGS.length];
  tickerIdx++;
}

// ── Toast notifications ──────────────────────────────────────

export function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add("visible"));

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── Formatting helpers ────────────────────────────────────────

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toString();
}
