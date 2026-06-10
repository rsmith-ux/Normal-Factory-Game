// ============================================================
//  game.js  –  Core game state, tick engine, save/load
// ============================================================

import { RESOURCES, BUILDINGS } from "./data.js";

// ── State ────────────────────────────────────────────────────

/** Live resource inventory  { resourceId: number } */
export const inventory = {};

/** How many of each building the player owns  { buildingId: number } */
export const owned = {};

/** Tracks the next-cost per building (scales up each purchase) { buildingId: number } */
export const nextCost = {};

/** Per-building tick timers (internal) */
const timers = {};

/** Listeners called after every game tick */
const tickListeners = [];

/** Listeners called when a building count changes */
const buildListeners = [];

/** Listeners called when an unlock state changes */
const unlockListeners = [];

// ── Initialisation ───────────────────────────────────────────

export function initGame() {
  // Seed inventory
  for (const id of Object.keys(RESOURCES)) {
    inventory[id] = 0;
  }

  // Seed buildings
  for (const b of BUILDINGS) {
    owned[b.id]    = 0;
    nextCost[b.id] = { ...b.cost };
  }

  // Seed starting resource so the player can afford their first building
  inventory.iron_ore = 0;
  inventory.points   = 0;

  loadGame();        // Overwrite with saved data if available
  startTicks();
  checkUnlocks();
}

// ── Event bus ────────────────────────────────────────────────

export function onTick(fn)    { tickListeners.push(fn); }
export function onBuild(fn)   { buildListeners.push(fn); }
export function onUnlock(fn)  { unlockListeners.push(fn); }

function emitTick()   { tickListeners.forEach(fn => fn()); }
function emitBuild()  { buildListeners.forEach(fn => fn()); }
function emitUnlock() { unlockListeners.forEach(fn => fn()); }

// ── Tick engine ──────────────────────────────────────────────

/** Start/restart tick intervals for all buildings the player owns >0. */
function startTicks() {
  // Clear old timers first (in case of reload)
  for (const id of Object.keys(timers)) {
    clearInterval(timers[id]);
    delete timers[id];
  }

  for (const b of BUILDINGS) {
    scheduleBuilding(b);
  }
}

function scheduleBuilding(b) {
  if (timers[b.id]) {
    clearInterval(timers[b.id]);
  }
  timers[b.id] = setInterval(() => tickBuilding(b), b.baseTickMs);
}

/**
 * One production cycle for a building.
 * Only produces if:
 *  - The player owns ≥1 of it
 *  - Enough input resources exist  (count × consumes)
 *  - Enough power exists            (count × powerDraw)
 */
function tickBuilding(b) {
  const count = owned[b.id];
  if (count === 0) return;

  // Check power (power resource acts as a buffer)
  const powerNeeded = b.powerDraw * count;
  if (powerNeeded > 0 && inventory.power < powerNeeded) return;

  // Check inputs
  for (const [res, amount] of Object.entries(b.consumes)) {
    if (inventory[res] < amount * count) return;
  }

  // Deduct power
  inventory.power = Math.max(0, inventory.power - powerNeeded);

  // Deduct inputs
  for (const [res, amount] of Object.entries(b.consumes)) {
    inventory[res] = Math.max(0, inventory[res] - amount * count);
  }

  // Add outputs
  for (const [res, amount] of Object.entries(b.produces)) {
    inventory[res] = (inventory[res] ?? 0) + amount * count;
  }

  checkUnlocks();
  emitTick();
  autosave();
}

// ── Purchasing ───────────────────────────────────────────────

/**
 * Returns true if the player can afford the next copy of buildingId.
 */
export function canAfford(buildingId) {
  const cost = nextCost[buildingId];
  for (const [res, amount] of Object.entries(cost)) {
    if ((inventory[res] ?? 0) < amount) return false;
  }
  return true;
}

/**
 * Purchases one copy of buildingId. Returns false if unaffordable.
 */
export function purchaseBuilding(buildingId) {
  if (!canAfford(buildingId)) return false;

  const b    = BUILDINGS.find(x => x.id === buildingId);
  const cost = nextCost[buildingId];

  // Deduct cost
  for (const [res, amount] of Object.entries(cost)) {
    inventory[res] -= amount;
  }

  owned[buildingId]++;

  // Scale next cost
  const scaled = {};
  for (const [res, amount] of Object.entries(cost)) {
    scaled[res] = Math.ceil(amount * b.costScaling);
  }
  nextCost[buildingId] = scaled;

  checkUnlocks();
  emitBuild();
  autosave();
  return true;
}

// ── Unlock logic ─────────────────────────────────────────────

/** Cache of what's unlocked so we only emit when state changes. */
const unlockState = {};

export function isUnlocked(buildingId) {
  const b = BUILDINGS.find(x => x.id === buildingId);
  if (b.unlocked) return true;
  if (!b.unlockRequires) return false;
  for (const [res, amount] of Object.entries(b.unlockRequires)) {
    // Unlock fires once the player has EVER accumulated this much
    // We track lifetime totals via unlockProgress
    if ((inventory[res] ?? 0) < amount) return false;
  }
  return true;
}

function checkUnlocks() {
  let changed = false;
  for (const b of BUILDINGS) {
    const was = unlockState[b.id] ?? false;
    const now  = isUnlocked(b.id);
    if (now !== was) {
      unlockState[b.id] = now;
      changed = true;
    }
  }
  if (changed) emitUnlock();
}

// ── Computed helpers ─────────────────────────────────────────

/** Returns the total power being produced per tick cycle (approximate). */
export function getPowerInfo() {
  let produced = 0;
  let consumed  = 0;
  for (const b of BUILDINGS) {
    const count = owned[b.id];
    if (count === 0) continue;
    produced += (b.produces.power ?? 0) * count;
    consumed  += b.powerDraw * count;
  }
  return { produced, consumed, buffer: inventory.power };
}

/** Returns items/min for each resource based on current buildings. */
export function getProductionRates() {
  const rates = {};
  for (const id of Object.keys(RESOURCES)) rates[id] = 0;

  for (const b of BUILDINGS) {
    const count = owned[b.id];
    if (count === 0) continue;
    const ticksPerMin = 60000 / b.baseTickMs;
    for (const [res, amt] of Object.entries(b.produces)) {
      rates[res] = (rates[res] ?? 0) + amt * count * ticksPerMin;
    }
    for (const [res, amt] of Object.entries(b.consumes)) {
      rates[res] = (rates[res] ?? 0) - amt * count * ticksPerMin;
    }
  }
  return rates;
}

// ── Save / Load ──────────────────────────────────────────────

const SAVE_KEY = "factory_save_v1";

let saveTimeout = null;
function autosave() {
  // Debounce: only save once per second
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveGame();
    saveTimeout = null;
  }, 1000);
}

export function saveGame() {
  const data = {
    inventory: { ...inventory },
    owned:     { ...owned },
    nextCost:  JSON.parse(JSON.stringify(nextCost)),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.inventory) Object.assign(inventory, data.inventory);
    if (data.owned)     Object.assign(owned,     data.owned);
    if (data.nextCost)  Object.assign(nextCost,  data.nextCost);
  } catch (e) {
    console.warn("Could not load save:", e);
  }
}

export function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
}
