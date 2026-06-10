/**
 * config.js — All tuneable game constants live here.
 * Edit this file to change map size, tick speed, prices, colours, etc.
 * Nothing in this file has side-effects; it only sets the CONFIG object.
 */

const CONFIG = Object.freeze({

  // ── Map ──────────────────────────────────────────
  MAP_COLS: 40,          // number of grid columns
  MAP_ROWS: 30,          // number of grid rows
  CELL_SIZE: 32,         // pixels per cell (renderer uses this)

  // ── Ore Veins ────────────────────────────────────
  ORE_VEIN_COUNT: 8,     // how many distinct ore veins to generate
  ORE_MIN_SIZE: 2,       // minimum radius (in cells) of a vein cluster
  ORE_MAX_SIZE: 5,       // maximum radius (in cells) of a vein cluster
  ORE_MIN_RICHNESS: 1,   // minimum ore units a single cell can hold
  ORE_MAX_RICHNESS: 3,   // maximum ore units a single cell can hold

  // ── Tick / Speed ─────────────────────────────────
  BASE_TICK_MS: 1000,     // milliseconds per game tick at 1x speed
  SPEED_LEVELS: [0.5, 1, 2, 4],  // available speed multipliers (index 1 = default)
  DEFAULT_SPEED_IDX: 1,

  // ── Buildings ────────────────────────────────────
  MINE_OUTPUT_PER_TICK: 1,     // iron produced per mine per tick
  MINE_CAPACITY: 20,           // max iron stored inside a mine before it stalls
  CONVEYOR_CAPACITY: 1,        // max items a single conveyor cell holds at once
  SELL_POINT_CAPACITY: 50,     // buffer before sell point stops accepting

  // ── Economy ──────────────────────────────────────
  IRON_SELL_PRICE: 1,          // credits earned per iron unit sold

  // ── Render Colours (keep in sync with CSS vars) ──
  COLORS: {
    BG_DEEP:    '#0d1117',
    BG_CELL:    '#1a2332',
    GRID_LINE:  '#1e3a5f',
    ACCENT:     '#4fc3f7',
    ORE:        '#ff9800',
    ORE_GLOW:   'rgba(255,152,0,0.25)',
    CONVEYOR:   '#66bb6a',
    CONVEYOR_BG:'rgba(102,187,106,0.15)',
    MINE:       '#4fc3f7',
    MINE_BG:    'rgba(79,195,247,0.15)',
    SELL:       '#ba68c8',
    SELL_BG:    'rgba(186,104,200,0.15)',
    HOVER:      'rgba(255,255,255,0.06)',
    SELECT:     'rgba(79,195,247,0.20)',
    TEXT_MAIN:  '#e0e0e0',
    TEXT_DIM:   '#607d8b',
  },

  // ── Item type IDs (add new resource types here) ──
  ITEMS: {
    IRON: 'iron',
  },

  // ── Building type registry ────────────────────────
  //    Add new building types here; logic lives in buildings.js
  BUILDING_TYPES: {
    MINE:       'mine',
    SELL_POINT: 'sell_point',
  },

  // ── Conveyor direction vectors ────────────────────
  CONVEYOR_DIRS: {
    conveyor_right: { dx:  1, dy:  0, label: '→' },
    conveyor_left:  { dx: -1, dy:  0, label: '←' },
    conveyor_up:    { dx:  0, dy: -1, label: '↑' },
    conveyor_down:  { dx:  0, dy:  1, label: '↓' },
  },

});
