# ⚙ FactoryOS — Factory Game Foundation

A clean, modular browser factory game. No build tools required — runs directly on **GitHub Pages** (or any static file host) using native ES modules.

---

## 🚀 Running the game

### GitHub Pages
1. Push this folder to a GitHub repo.
2. Go to **Settings → Pages** and set the source to the branch/folder containing `index.html`.
3. Visit your Pages URL — that's it.

### Locally (requires a local server — browsers block ES modules from `file://`)
```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code
Install the "Live Server" extension, then click "Go Live".
```
Then open `http://localhost:8080`.

---

## 📁 Project structure

```
factory-game/
├── index.html          ← Shell: layout, panels, script tag
├── css/
│   └── style.css       ← All styles (dark theme, cards, layout)
└── js/
    ├── data.js         ← 🗂  Static data: RESOURCES + BUILDINGS definitions
    ├── game.js         ← ⚙️  Game engine: state, tick loop, buy, save/load
    ├── ui.js           ← 🖼  DOM rendering: inventory, cards, stats, toasts
    └── main.js         ← 🚪 Entry point: wires game events → UI redraws
```

### One-sentence description of each file
| File | Job |
|------|-----|
| `data.js` | Define resources and buildings. **Start here to add content.** |
| `game.js` | Owns all mutable state. Exposes `purchaseBuilding`, `onTick`, `onBuild`, etc. |
| `ui.js` | Reads game state and writes to the DOM. Never mutates game state directly. |
| `main.js` | 10-line glue: init game → init UI → subscribe events. |

---

## 🎮 How to play

1. **Build an Iron Mine** — it's free and already unlocked.
2. Accumulate iron ore → unlocks the **Coal Mine**.
3. Build both → unlock the **Iron Smelter**.
4. Keep following unlock requirements shown on each card.
5. Build a **Coal Generator** for power (needed by advanced machines).
6. Reach **Circuit Fab** to earn Tech Points and dominate.

**Tech Points** are the currency used to purchase buildings. The first Iron Mine is free; everything else costs points earned by production.

---

## ✏️ Adding a new resource

In `js/data.js`, add an entry to `RESOURCES`:

```js
widgets: { id: "widgets", name: "Widgets", icon: "🔧", color: "#aaffaa" },
```

---

## 🏗 Adding a new building

In `js/data.js`, push a new object into `BUILDINGS`:

```js
{
  id:          "widget_factory",
  name:        "Widget Factory",
  icon:        "🔧",
  category:    "fabrication",   // extraction | processing | power | fabrication
  description: "Turns iron bars into widgets.",
  cost:        { points: 60 },  // what the player pays to build one
  costScaling: 1.8,             // cost multiplier per additional copy
  produces:    { widgets: 2 },  // output per tick
  consumes:    { iron_bar: 1 }, // input consumed per tick (empty obj = none)
  powerDraw:   4,               // power consumed per tick per building
  baseTickMs:  3000,            // tick interval in milliseconds
  unlocked:    false,
  unlockRequires: { iron_bar: 20 },  // inventory threshold to reveal the card
},
```

No other files need to change.

---

## 💾 Save system

Progress saves to `localStorage` automatically (debounced to once/second). The **💾 Save** button forces an immediate save. **↺ Reset** wipes the save and reloads.

---

## 🗺 Planned extension points

- [ ] Research tree (spend tech points on upgrades that multiply output)
- [ ] Map/grid view for placing buildings spatially
- [ ] Prestige/loop mechanic
- [ ] Sound effects (Web Audio API)
- [ ] Import/export save as JSON string
