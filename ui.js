/**
 * ui.js — DOM bindings, sidebar interactions, inspector panel, and log.
 *
 * Responsibilities:
 *  - Wire up sidebar build buttons → State.selectedTool
 *  - Canvas mouse events → hover / click → place / delete / inspect
 *  - Top-bar speed controls
 *  - Resource display updates
 *  - Inspector panel (click a cell to see what's there)
 *  - Log bar messages
 *
 * UI intentionally contains NO game logic — it only reads State and calls
 * Buildings.place(), Conveyors.place(), and State.removeOccupant().
 */

const UI = (() => {

  // ── Tool metadata for display ──────────────────
  const TOOL_META = {
    mine:           { name: 'Mine',         desc: 'Extracts iron ore. Must be placed on an amber ore vein.' },
    conveyor_right: { name: 'Conveyor →',   desc: 'Moves items one cell East each tick.' },
    conveyor_left:  { name: 'Conveyor ←',   desc: 'Moves items one cell West each tick.' },
    conveyor_up:    { name: 'Conveyor ↑',   desc: 'Moves items one cell North each tick.' },
    conveyor_down:  { name: 'Conveyor ↓',   desc: 'Moves items one cell South each tick.' },
    sell_point:     { name: 'Sell Point',   desc: 'Accepts iron from conveyors and converts it to Credits each tick.' },
    delete:         { name: 'Delete',       desc: 'Click any placed building or conveyor to remove it.' },
  };

  // ── Log ───────────────────────────────────────
  let _logTimeout = null;
  function log(msg) {
    const el = document.getElementById('log-message');
    if (!el) return;
    el.textContent = msg;
    el.style.color = '#e0e0e0';
    clearTimeout(_logTimeout);
    _logTimeout = setTimeout(() => { el.style.color = '#607d8b'; }, 4000);
  }

  // ── Resource display ───────────────────────────
  function updateResources() {
    document.getElementById('val-iron').textContent    = State.resources.iron;
    document.getElementById('val-credits').textContent = State.resources.credits;
    const speed = CONFIG.SPEED_LEVELS[State.speedIdx];
    document.getElementById('val-tick').textContent = State.paused ? 'PAUSED' : `${speed}x`;
  }

  // ── Tool selection ─────────────────────────────
  function selectTool(type) {
    State.setSelectedTool(type);

    // Update active class on all build buttons
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    const meta = TOOL_META[type] || { name: type, desc: '' };
    document.getElementById('selected-tool-name').textContent = meta.name;
    document.getElementById('selected-tool-desc').textContent = meta.desc;
  }

  // ── Inspector ──────────────────────────────────
  function inspectCell(x, y) {
    State.setSelectedCell({ x, y });
    const el = document.getElementById('inspector-content');
    const cell = State.getCell(x, y);
    if (!cell) { el.textContent = '—'; return; }

    const occupant = State.getOccupant(x, y);
    let lines = [`pos: (${x}, ${y})`, `terrain: ${cell.terrain}`];

    if (cell.terrain === 'ore') {
      lines.push(`ore: ${cell.oreType}`);
      lines.push(`richness: ${cell.oreRichness} / ${CONFIG.ORE_MAX_RICHNESS}`);
    }

    if (occupant) {
      lines.push('');
      lines.push(`kind: ${occupant.kind}`);
      if (occupant.inventory) {
        Object.entries(occupant.inventory).forEach(([item, qty]) => {
          lines.push(`${item}: ${qty}`);
        });
      }
      if (occupant.item !== undefined) {
        lines.push(`carrying: ${occupant.item || 'empty'}`);
      }
    } else {
      lines.push('');
      lines.push('(empty)');
    }

    el.textContent = lines.join('\n');
  }

  // ── Canvas interaction ─────────────────────────
  function initCanvas() {
    const canvas = document.getElementById('game-canvas');
    const coords = document.getElementById('map-coords');

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const cell = Renderer.pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
      State.setHoveredCell(cell);
      if (cell) {
        coords.textContent = `x:${cell.x} y:${cell.y}`;
      } else {
        coords.textContent = '—';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      State.setHoveredCell(null);
      coords.textContent = '—';
    });

    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const cell = Renderer.pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
      if (!cell) return;

      const tool = State.selectedTool;

      if (tool === 'delete') {
        const removed = State.removeOccupant(cell.x, cell.y);
        if (removed) {
          log(`Removed ${removed.kind} at (${cell.x}, ${cell.y}).`);
        } else {
          log(`Nothing to delete at (${cell.x}, ${cell.y}).`);
        }
        inspectCell(cell.x, cell.y);
        return;
      }

      // Conveyor?
      if (CONFIG.CONVEYOR_DIRS[tool]) {
        Conveyors.place(tool, cell.x, cell.y);
        inspectCell(cell.x, cell.y);
        return;
      }

      // Building?
      if (Object.values(CONFIG.BUILDING_TYPES).includes(tool)) {
        Buildings.place(tool, cell.x, cell.y);
        inspectCell(cell.x, cell.y);
        return;
      }

      // Fallback: just inspect
      inspectCell(cell.x, cell.y);
    });
  }

  // ── Speed controls ─────────────────────────────
  function initSpeedControls() {
    document.getElementById('btn-speed-up').addEventListener('click', () => {
      State.setSpeedIdx(State.speedIdx + 1);
      Game.restartTicker();
      updateResources();
    });
    document.getElementById('btn-speed-down').addEventListener('click', () => {
      State.setSpeedIdx(State.speedIdx - 1);
      Game.restartTicker();
      updateResources();
    });
    document.getElementById('btn-pause').addEventListener('click', () => {
      State.togglePause();
      document.getElementById('btn-pause').textContent = State.paused ? '▶' : '⏸';
      Game.restartTicker();
      updateResources();
    });
  }

  // ── Sidebar buttons ────────────────────────────
  function initBuildButtons() {
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', () => selectTool(btn.dataset.type));
    });
  }

  // ── Bootstrap ─────────────────────────────────
  function init() {
    initBuildButtons();
    initCanvas();
    initSpeedControls();
    selectTool('delete'); // default tool
  }

  // ── Public API ─────────────────────────────────
  return {
    init,
    log,
    updateResources,
    inspectCell,
    selectTool,
  };
})();
