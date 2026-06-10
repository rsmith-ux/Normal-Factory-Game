/**
 * buildings.js — Building definitions and per-tick logic.
 *
 * To add a new building type:
 *  1. Add its key to CONFIG.BUILDING_TYPES in config.js
 *  2. Add a factory function below (makeXxx)
 *  3. Add a tick handler in Buildings.tickBuilding()
 *  4. Add render hints in renderer.js (drawBuilding)
 *
 * Building object shape:
 * {
 *   id:       string  "x,y"
 *   kind:     string  CONFIG.BUILDING_TYPES key
 *   x, y:     number  grid position
 *   inventory: { [itemType]: number }  items stored inside
 *   meta:     {}      building-specific extra data
 * }
 */

const Buildings = (() => {

  // ── Factories ──────────────────────────────────

  function makeMine(x, y) {
    return {
      id:        State.cellId(x, y),
      kind:      CONFIG.BUILDING_TYPES.MINE,
      x, y,
      inventory: { [CONFIG.ITEMS.IRON]: 0 },
      meta: {
        // tracks ore left in the vein (not currently depleted — extendable)
        oreType: CONFIG.ITEMS.IRON,
      },
    };
  }

  function makeSellPoint(x, y) {
    return {
      id:        State.cellId(x, y),
      kind:      CONFIG.BUILDING_TYPES.SELL_POINT,
      x, y,
      inventory: { [CONFIG.ITEMS.IRON]: 0 },
      meta: {},
    };
  }

  // ── Placement validation ───────────────────────

  /**
   * canPlace(type, x, y) — returns { ok: bool, reason: string }
   * Called before actually placing to give the player feedback.
   */
  function canPlace(type, x, y) {
    const cell = State.getCell(x, y);
    if (!cell) return { ok: false, reason: 'Out of bounds.' };

    if (State.getOccupant(x, y)) return { ok: false, reason: 'Cell is already occupied.' };

    if (type === CONFIG.BUILDING_TYPES.MINE) {
      if (cell.terrain !== 'ore') return { ok: false, reason: 'Mines must be placed on an ore vein (amber cell).' };
    }

    return { ok: true, reason: '' };
  }

  // ── Tick handlers ──────────────────────────────

  /** Run one tick of logic for every building. */
  function tickAll() {
    State.buildings.forEach(b => tickBuilding(b));
  }

  function tickBuilding(b) {
    switch (b.kind) {
      case CONFIG.BUILDING_TYPES.MINE:      tickMine(b);      break;
      case CONFIG.BUILDING_TYPES.SELL_POINT: tickSellPoint(b); break;
      // Add cases here for new building types
    }
  }

  function tickMine(mine) {
    const stored = mine.inventory[CONFIG.ITEMS.IRON] || 0;
    if (stored >= CONFIG.MINE_CAPACITY) return; // stalled — full

    // Produce iron
    mine.inventory[CONFIG.ITEMS.IRON] = stored + CONFIG.MINE_OUTPUT_PER_TICK;

    // Push to an adjacent conveyor (first matching neighbour wins)
    pushOutput(mine, CONFIG.ITEMS.IRON);
  }

  function tickSellPoint(sp) {
    const stored = sp.inventory[CONFIG.ITEMS.IRON] || 0;
    if (stored <= 0) return;

    // Sell all buffered iron
    const earned = stored * CONFIG.IRON_SELL_PRICE;
    State.addCredits(earned);
    sp.inventory[CONFIG.ITEMS.IRON] = 0;
  }

  // ── Item output helper ─────────────────────────

  /**
   * pushOutput(building, itemType) — attempts to push one unit of itemType
   * from building.inventory into any adjacent conveyor that is empty and
   * facing away from (or orthogonally to) the building.
   *
   * Simple rule: any empty adjacent conveyor will accept one item.
   * Conveyors then handle moving items forward on their own tick.
   */
  function pushOutput(building, itemType) {
    if ((building.inventory[itemType] || 0) <= 0) return;

    const neighbours = [
      { x: building.x + 1, y: building.y },
      { x: building.x - 1, y: building.y },
      { x: building.x,     y: building.y + 1 },
      { x: building.x,     y: building.y - 1 },
    ];

    for (const nb of neighbours) {
      const conv = State.getConveyor(nb.x, nb.y);
      if (conv && conv.item === null) {
        conv.item = itemType;
        building.inventory[itemType]--;
        return; // pushed one item, done for this tick
      }
    }
  }

  // ── Public API ─────────────────────────────────
  return {
    makeMine,
    makeSellPoint,
    canPlace,
    tickAll,

    /** Place a building on the grid after validation. Returns true on success. */
    place(type, x, y) {
      const check = canPlace(type, x, y);
      if (!check.ok) { UI.log(check.reason); return false; }

      let building;
      switch (type) {
        case CONFIG.BUILDING_TYPES.MINE:       building = makeMine(x, y);      break;
        case CONFIG.BUILDING_TYPES.SELL_POINT: building = makeSellPoint(x, y); break;
        default:
          UI.log(`Unknown building type: ${type}`);
          return false;
      }

      State.placeBuilding(building);
      UI.log(`Placed ${type} at (${x}, ${y}).`);
      return true;
    },
  };
})();
