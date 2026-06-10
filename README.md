# ⚙ FactoryGrid
 https://rsmith-ux.github.io/Normal-Factory-Game/
A modular, open-world factory game foundation built for GitHub Pages.  
No build step, no dependencies — pure HTML + CSS + JS.

---

## 🚀 Running Locally / Deploying

**Local:** Open `index.html` directly in any modern browser.  
**GitHub Pages:** Push the repo to GitHub, go to *Settings → Pages*, set source to `main` branch `/root`. Done.

---

## 🗺 How to Play

1. **Find an ore vein** — amber glowing cells on the map.
2. **Place a Mine** on one (select Mine in the sidebar, click an amber cell).
3. **Place Conveyors** leading away from the mine toward a sell point.
4. **Place a Sell Point** at the end of your conveyor chain.
5. Watch iron flow, get Credits!

---

## 📁 File Structure

```
factory-game/
│
├── index.html          — Page shell, layout, script tags
│
├── css/
│   └── style.css       — All visual styles (uses CSS variables)
│
└── js/
    ├── config.js       ← START HERE TO TWEAK THE GAME
    ├── state.js        — Single source of truth (all runtime data)
    ├── mapgen.js       — Procedural ore vein placement
    ├── buildings.js    — Mine, Sell Point logic & placement
    ├── conveyor.js     — Belt placement & item propagation
    ├── renderer.js     — Canvas 2D drawing engine
    ├── ui.js           — DOM wiring, inspector, log, tool buttons
    └── game.js         — Bootstrap, game loop, tick scheduler
```

---

## ⚙ Tweaking the Game — `config.js`

Everything tuneable lives in `CONFIG` (frozen object, no side-effects).

| Key | Default | What it does |
|---|---|---|
| `MAP_COLS / MAP_ROWS` | 40 × 30 | Map size in grid cells |
| `CELL_SIZE` | 32 | Pixels per cell |
| `ORE_VEIN_COUNT` | 8 | Ore veins generated per map |
| `ORE_MIN/MAX_SIZE` | 2 – 5 | Vein radius range (cells) |
| `ORE_MIN/MAX_RICHNESS` | 1 – 6 | Iron per vein cell |
| `BASE_TICK_MS` | 800 | Milliseconds per tick at 1× speed |
| `SPEED_LEVELS` | [0.5, 1, 2, 4] | Available speed multipliers |
| `MINE_OUTPUT_PER_TICK` | 1 | Iron produced per mine per tick |
| `MINE_CAPACITY` | 20 | Mine stalls when full |
| `IRON_SELL_PRICE` | 1 | Credits per iron unit |

---

## 🔧 Extending the Game

### Adding a new Resource type

1. Add a key to `CONFIG.ITEMS` in `config.js`.
2. Update `buildings.js` / `conveyor.js` to produce/accept it.
3. Add a display entry in `ui.js` (`updateResources`, `TOOL_META`).

### Adding a new Building

1. Add a key to `CONFIG.BUILDING_TYPES` in `config.js`.
2. Add a factory function `makeXxx(x, y)` in `buildings.js`.
3. Add a `tickXxx()` handler and a `case` in `tickBuilding()`.
4. Add a placement validation case in `canPlace()`.
5. Add a draw case in `renderer.js → drawBuilding()`.
6. Add a `<button class="build-btn" data-type="...">` in `index.html`.
7. Add tool metadata in `ui.js → TOOL_META`.

### Adding a new Conveyor type (e.g. splitter)

1. Add an entry to `CONFIG.CONVEYOR_DIRS` in `config.js`.
2. Override behaviour in `conveyor.js → tickConveyor()`.
3. Add a button and metadata following the pattern above.

### Adding Map Pan / Zoom

The renderer uses `Renderer.offsetX/Y` to centre the map.  
Replace those with a camera object and update `pixelToCell()` to account for it.

---

## 🐛 Architecture Notes

- **No framework, no bundler.** Scripts load in order via `<script>` tags; later scripts can safely call earlier ones.
- **State is never mutated directly** outside `state.js` helpers — this makes future save/load trivial.
- **Tick and render are decoupled.** Tick fires on `setInterval`; render fires on `requestAnimationFrame`. They don't block each other.
- **Conveyor tick order** runs end-of-chain first (sorted by travel direction score) to allow cascade movement without multi-pass.
