/**
 * mapgen.js — Procedural map generation.
 *
 * Responsibilities:
 *  - Build the initial grid of cell objects
 *  - Place ore veins (clusters of cells with varying richness)
 *
 * Each cell object:
 * {
 *   x, y          : grid position
 *   terrain: 'ground' | 'ore'
 *   oreRichness: number   (0 = no ore, 1-6 = iron richness tier)
 *   oreType: 'iron' | null
 * }
 *
 * Veins always appear on the map (CONFIG.ORE_VEIN_COUNT) but vary in size
 * (CONFIG.ORE_MIN_SIZE … ORE_MAX_SIZE cells radius) and richness per cell.
 */

const MapGen = (() => {

  // ── Minimal seeded PRNG (Mulberry32) ───────────
  function makePRNG(seed) {
    let s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Cell factory ───────────────────────────────
  function makeCell(x, y) {
    return {
      x,
      y,
      terrain: 'ground',
      oreRichness: 0,
      oreType: null,
    };
  }

  // ── Build blank grid ───────────────────────────
  function buildGrid() {
    const grid = [];
    for (let y = 0; y < CONFIG.MAP_ROWS; y++) {
      const row = [];
      for (let x = 0; x < CONFIG.MAP_COLS; x++) {
        row.push(makeCell(x, y));
      }
      grid.push(row);
    }
    return grid;
  }

  // ── Place ore veins ────────────────────────────
  /**
   * Veins are placed using a scatter-then-cluster approach:
   *  1. Pick a centre point (biased away from map edges).
   *  2. For each cell within radius r of the centre,
   *     assign oreRichness proportional to distance from centre
   *     (denser core, sparser edges) plus a little random variation.
   *  3. Repeat for ORE_VEIN_COUNT veins, checking minimum separation
   *     between centres so they don't fully overlap.
   */
  function placeVeins(grid, rng) {
    const placed = [];   // array of {cx, cy} for separation checks

    const margin = CONFIG.ORE_MAX_SIZE + 1;
    const minSep = CONFIG.ORE_MIN_SIZE * 3;

    for (let v = 0; v < CONFIG.ORE_VEIN_COUNT; v++) {
      let cx, cy, attempts = 0;

      // Try to find a non-overlapping centre
      do {
        cx = margin + Math.floor(rng() * (CONFIG.MAP_COLS - margin * 2));
        cy = margin + Math.floor(rng() * (CONFIG.MAP_ROWS - margin * 2));
        attempts++;
        if (attempts > 200) break; // safety escape — just place it
      } while (placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < minSep));

      placed.push({ cx, cy });

      // Radius for this vein
      const radius = CONFIG.ORE_MIN_SIZE + Math.floor(rng() * (CONFIG.ORE_MAX_SIZE - CONFIG.ORE_MIN_SIZE + 1));

      // Paint cells within the radius
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          const gx = cx + dx;
          const gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= CONFIG.MAP_COLS || gy >= CONFIG.MAP_ROWS) continue;

          // Richness falls off from centre; add noise
          const falloff = 1 - (dist / (radius + 0.1));
          const noise   = rng() * 0.4 - 0.2;  // ±0.2
          const richness = Math.round(
            CONFIG.ORE_MIN_RICHNESS +
            (CONFIG.ORE_MAX_RICHNESS - CONFIG.ORE_MIN_RICHNESS) * Math.max(0, falloff + noise)
          );

          if (richness > 0) {
            const cell = grid[gy][gx];
            // Keep the richer value if multiple veins overlap
            if (richness > cell.oreRichness) {
              cell.terrain     = 'ore';
              cell.oreRichness = richness;
              cell.oreType     = CONFIG.ITEMS.IRON;
            }
          }
        }
      }
    }
  }

  // ── Public API ─────────────────────────────────
  /**
   * generate(seed) — builds and returns a fully populated grid.
   * Pass a numeric seed for reproducible maps (default: random).
   */
  function generate(seed = Math.floor(Math.random() * 0xFFFFFF)) {
    const rng  = makePRNG(seed);
    const grid = buildGrid();
    placeVeins(grid, rng);
    return grid;
  }

  return { generate };
})();
