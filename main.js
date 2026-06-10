// ============================================================
//  main.js  –  Entry point
//  Initialises the game engine, wires events to UI redraws.
// ============================================================

import { initGame, onTick, onBuild, onUnlock } from "./game.js";
import { initUI, renderInventory, renderBuildings, renderStats, renderTicker, showToast } from "./ui.js";

// 1. Boot the game engine (loads save if present)
initGame();

// 2. Boot the UI (renders initial state)
initUI();

// 3. Wire engine events → UI updates ─────────────────────────

//  Every production tick: refresh inventory + stats
onTick(() => {
  renderInventory();
  renderStats();
});

//  Every build purchase: refresh buildings list + stats
onBuild(() => {
  renderBuildings();
  renderInventory();
  renderStats();
});

//  Whenever something unlocks: rebuild the buildings panel
onUnlock(() => {
  renderBuildings();
  showToast("🔓 New building unlocked!", "unlock");
});

// 4. Slow UI refresh (every 2s) for affordability highlighting ─
setInterval(() => {
  renderBuildings();
  renderStats();
}, 2000);

// 5. Ticker carousel (every 4s) ──────────────────────────────
setInterval(() => {
  renderTicker();
}, 4000);
