/**
 * state.js — Single source of truth for all runtime game data.
 *
 * Structure:
 *   State.resources  — player inventory / economy
 *   State.grid       — 2D array of cells (terrain + placed objects)
 *   State.buildings  — Map<id, Building> for fast lookup
 *   State.conveyors  — Map<id, Conveyor> for fast lookup
 *   State.tick       — current game tick counter
 *   State.speedIdx   — index into CONFIG.SPEED_LEVELS
 *   State.paused     — boolean
 *   State.selectedTool — currently selected build/delete tool string
 *   State.hoveredCell  — {x, y} | null
 *   State.selectedCell — {x, y} | null
 *
 * All mutation should go through State.set* helpers so the renderer
 * can track dirty flags in the future.
 */

const State = (() => {

  // ── Internal data ──────────────────────────────
  const _resources = {
    iron: 0,
    credits: 0,
  };

  // grid[y][x] = cell object (set up by mapgen.js)
  let _grid = [];

  // Fast-lookup maps keyed by "x,y" id
  const _buildings = new Map();   // id → Building
  const _conveyors = new Map();   // id → Conveyor

  let _tick = 0;
  let _speedIdx = CONFIG.DEFAULT_SPEED_IDX;
  let _paused = false;
  let _selectedTool = 'delete';
  let _hoveredCell = null;
  let _selectedCell = null;
let _mapSeed = 0;
  // ── Helpers ────────────────────────────────────

  /** Canonical string key for a grid position */
  function cellId(x, y) { return `${x},${y}`; }

  /** Returns the cell object at (x, y), or null if out of bounds */
  function getCell(x, y) {
    if (x < 0 || y < 0 || x >= CONFIG.MAP_COLS || y >= CONFIG.MAP_ROWS) return null;
    return _grid[y][x];
  }

  /** Returns the building at (x, y), or null */
  function getBuilding(x, y) { return _buildings.get(cellId(x, y)) || null; }

  /** Returns the conveyor at (x, y), or null */
  function getConveyor(x, y) { return _conveyors.get(cellId(x, y)) || null; }

  /** Returns the object occupying a cell (building OR conveyor), or null */
  function getOccupant(x, y) { return getBuilding(x, y) || getConveyor(x, y) || null; }

  /** Add iron to the player's stockpile (can be negative to consume) */
  function addIron(amount) { _resources.iron = Math.max(0, _resources.iron + amount); }

  /** Add credits to the player */
  function addCredits(amount) { _resources.credits = Math.max(0, _resources.credits + amount); }

  /** Place a building; returns false if cell is blocked */
  function placeBuilding(building) {
    const id = cellId(building.x, building.y);
    if (_buildings.has(id) || _conveyors.has(id)) return false;
    _buildings.set(id, building);
    return true;
  }

  /** Place a conveyor; returns false if cell is blocked */
  function placeConveyor(conveyor) {
    const id = cellId(conveyor.x, conveyor.y);
    if (_buildings.has(id) || _conveyors.has(id)) return false;
    _conveyors.set(id, conveyor);
    return true;
  }

  /** Remove whatever is at (x, y). Returns the removed object or null. */
  function removeOccupant(x, y) {
    const id = cellId(x, y);
    if (_buildings.has(id)) { const b = _buildings.get(id); _buildings.delete(id); return b; }
    if (_conveyors.has(id)) { const c = _conveyors.get(id); _conveyors.delete(id); return c; }
    return null;
  }

  // ── Public API ─────────────────────────────────
  return {
    // Accessors
    get resources() { return _resources; },
    get grid()      { return _grid; },
    get buildings() { return _buildings; },
    get conveyors() { return _conveyors; },
    get tick()      { return _tick; },
    get speedIdx()  { return _speedIdx; },
    get paused()    { return _paused; },
    get selectedTool() { return _selectedTool; },
    get hoveredCell()  { return _hoveredCell; },
    get selectedCell() { return _selectedCell; },
get mapSeed()  { return _mapSeed; },
set mapSeed(s) { _mapSeed = s; },
    // Mutators
    setGrid(g)           { _grid = g; },
    incrementTick()      { _tick++; },
    setSpeedIdx(i)       { _speedIdx = Math.max(0, Math.min(CONFIG.SPEED_LEVELS.length - 1, i)); },
    togglePause()        { _paused = !_paused; },
    setSelectedTool(t)   { _selectedTool = t; },
    setHoveredCell(c)    { _hoveredCell = c; },
    setSelectedCell(c)   { _selectedCell = c; },

    // Grid / placement helpers (exposed so other modules can use them)
    cellId,
    getCell,
    getBuilding,
    getConveyor,
    getOccupant,
    addIron,
    addCredits,
    placeBuilding,
    placeConveyor,
    removeOccupant,
  };
})();
