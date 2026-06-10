/**
 * save.js — Local save/load system using localStorage.
 *
 * Key:  'factorygrid_save'
 *
 * What is saved:
 *   - Player resources (iron, credits)
 *   - All placed buildings (kind, position, inventory)
 *   - All placed conveyors (kind, position, carried item)
 *   - The map seed so the same ore veins are restored
 *   - Current tick count
 *
 * What is NOT saved:
 *   - Speed / pause state (always resumes at default speed)
 *   - Hovered / selected cell (UI-only, not meaningful to persist)
 *
 * Usage:
 *   SaveSystem.save()   — write to localStorage, log confirmation
 *   SaveSystem.load()   — read from localStorage, return true if successful
 *   SaveSystem.clear()  — delete the save slot
 *   SaveSystem.exists() — returns true if a save is present
 */

const SaveSystem = (() => {

  const SAVE_KEY = 'factorygrid_save';
  const VERSION  = 1;  // bump this if the save format ever changes

  // ── Serialise ──────────────────────────────────

  function save() {
    try {
      const payload = {
        version:   VERSION,
        savedAt:   Date.now(),
        seed:      State.mapSeed,
        tick:      State.tick,
        resources: { ...State.resources },

        // Convert Maps to plain arrays for JSON
        buildings: Array.from(State.buildings.values()).map(b => ({
          kind:      b.kind,
          x:         b.x,
          y:         b.y,
          inventory: { ...b.inventory },
        })),

        conveyors: Array.from(State.conveyors.values()).map(c => ({
          kind: c.kind,
          x:    c.x,
          y:    c.y,
          item: c.item,
        })),
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      UI.log(`Game saved. (${new Date(payload.savedAt).toLocaleTimeString()})`);
      return true;

    } catch (err) {
      UI.log(`Save failed: ${err.message}`);
      return false;
    }
  }

  // ── Deserialise ────────────────────────────────

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { UI.log('No save file found.'); return false; }

      const payload = JSON.parse(raw);

      // Version guard — if format changed, refuse rather than corrupt state
      if (payload.version !== VERSION) {
        UI.log(`Save version mismatch (file: v${payload.version}, game: v${VERSION}). Cannot load.`);
        return false;
      }

      // Rebuild the map with the original seed so ore veins match
      const grid = MapGen.generate(payload.seed);
      State.setGrid(grid);
      State.mapSeed = payload.seed;

      // Restore resources
      const r = payload.resources;
      // Reset to 0 first, then add back
      State.resources.iron    = 0;
      State.resources.credits = 0;
      State.addIron(r.iron || 0);
      State.addCredits(r.credits || 0);

      // Clear existing placements
      State.buildings.clear();
      State.conveyors.clear();

      // Restore buildings
      payload.buildings.forEach(b => {
        let building;
        switch (b.kind) {
          case CONFIG.BUILDING_TYPES.MINE:
            building = Buildings.makeMine(b.x, b.y);
            break;
          case CONFIG.BUILDING_TYPES.SELL_POINT:
            building = Buildings.makeSellPoint(b.x, b.y);
            break;
          default:
            console.warn(`SaveSystem.load: unknown building kind "${b.kind}", skipped.`);
            return;
        }
        building.inventory = { ...b.inventory };
        State.placeBuilding(building);
      });

      // Restore conveyors
      payload.conveyors.forEach(c => {
        if (!CONFIG.CONVEYOR_DIRS[c.kind]) {
          console.warn(`SaveSystem.load: unknown conveyor kind "${c.kind}", skipped.`);
          return;
        }
        const conv = Conveyors.makeConveyor(c.kind, c.x, c.y);
        conv.item = c.item;
        State.placeConveyor(conv);
      });

      const when = new Date(payload.savedAt).toLocaleTimeString();
      UI.log(`Save loaded. (saved at ${when})`);
      UI.updateResources();
      return true;

    } catch (err) {
      UI.log(`Load failed: ${err.message}`);
      console.error('SaveSystem.load error:', err);
      return false;
    }
  }

  // ── Helpers ────────────────────────────────────

  /** Delete the save from localStorage. */
  function clear() {
    localStorage.removeItem(SAVE_KEY);
    UI.log('Save file deleted.');
  }

  /** Returns true if a save slot exists. */
  function exists() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  // ── Public API ─────────────────────────────────
  return { save, load, clear, exists };

})();
