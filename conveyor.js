/**
 * conveyor.js — Conveyor belt placement and per-tick item propagation.
 *
 * Conveyor object shape:
 * {
 *   id:        string  "x,y"
 *   kind:      string  e.g. 'conveyor_right'
 *   x, y:      number  grid position
 *   dx, dy:    number  direction vector (+1/-1 on one axis, 0 on the other)
 *   item:      string | null   item type currently being carried (null = empty)
 * }
 *
 * Tick logic:
 *  - Process conveyors in the direction of travel first (anti-deadlock order).
 *  - Each conveyor tries to push its item one step forward.
 *  - The destination can be: another conveyor (must be empty), a building
 *    inventory (if it's a sell point), or nothing (item is discarded with a log).
 *
 * To add new belt types (splitters, mergers, etc.):
 *  1. Add direction info to CONFIG.CONVEYOR_DIRS in config.js.
 *  2. Add a tick case or override in tickConveyor() below.
 */

const Conveyors = (() => {

  // ── Factory ────────────────────────────────────

  function makeConveyor(kind, x, y) {
    const dir = CONFIG.CONVEYOR_DIRS[kind];
    return {
      id:   State.cellId(x, y),
      kind,
      x, y,
      dx:   dir.dx,
      dy:   dir.dy,
      item: null,
    };
  }

  // ── Placement validation ───────────────────────

  function canPlace(kind, x, y) {
    if (!CONFIG.CONVEYOR_DIRS[kind]) return { ok: false, reason: `Unknown conveyor type: ${kind}` };
    const cell = State.getCell(x, y);
    if (!cell) return { ok: false, reason: 'Out of bounds.' };
    if (State.getOccupant(x, y)) return { ok: false, reason: 'Cell is already occupied.' };
    return { ok: true, reason: '' };
  }

  // ── Tick ───────────────────────────────────────

  /**
   * tickAll() — advance every conveyor by one step.
   *
   * Order matters: propagate from the *end* of chains toward the start,
   * so items can cascade multiple cells per tick without needing multi-pass.
   * We achieve this by sorting conveyors in reverse travel direction.
   */
  function tickAll() {
    // Collect into an array and sort
    const convList = Array.from(State.conveyors.values());

    // Sort: prefer to tick the conveyor furthest in travel direction first
    // (i.e. largest dx*x + dy*y last → we push items from front-to-back)
    convList.sort((a, b) => {
      const scoreA = a.dx * a.x + a.dy * a.y;
      const scoreB = b.dx * b.x + b.dy * b.y;
      return scoreB - scoreA; // descending
    });

    convList.forEach(tickConveyor);
  }

  function tickConveyor(conv) {
    if (conv.item === null) return; // nothing to move

    const tx = conv.x + conv.dx;
    const ty = conv.y + conv.dy;

    // ── Destination: another conveyor ──
    const nextConv = State.getConveyor(tx, ty);
    if (nextConv) {
      if (nextConv.item === null) {
        nextConv.item = conv.item;
        conv.item = null;
      }
      // else blocked — item stays on current conveyor
      return;
    }

    // ── Destination: a building ──
    const building = State.getBuilding(tx, ty);
    if (building) {
      pushToBuilding(conv, building);
      return;
    }

    // ── Destination: off-map or empty ground — drop item ──
    // (item is silently consumed; you could add a "floor pile" system here)
    conv.item = null;
  }

  /**
   * pushToBuilding — hand off one item from a conveyor to a building's inventory.
   * Only accepts if the building has room.
   */
  function pushToBuilding(conv, building) {
    const item = conv.item;

    // Only sell points accept incoming items currently
    if (building.kind === CONFIG.BUILDING_TYPES.SELL_POINT) {
      const stored = building.inventory[item] || 0;
      if (stored < CONFIG.SELL_POINT_CAPACITY) {
        building.inventory[item] = stored + 1;
        conv.item = null;
        // If it's iron, count it in the player's global iron tally
        if (item === CONFIG.ITEMS.IRON) State.addIron(1);
      }
      // else sell point is full — conveyor stays loaded (backed up)
    }
    // Add else-if branches here for new buildings that accept inputs
  }

  // ── Public API ─────────────────────────────────
  return {
    makeConveyor,
    canPlace,
    tickAll,

    /** Place a conveyor after validation. Returns true on success. */
    place(kind, x, y) {
      const check = canPlace(kind, x, y);
      if (!check.ok) { UI.log(check.reason); return false; }

      const conv = makeConveyor(kind, x, y);
      State.placeConveyor(conv);
      return true;
    },
  };
})();
