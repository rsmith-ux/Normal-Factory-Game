/**
 * renderer.js — Canvas 2D rendering engine.
 *
 * Draws:
 *  - Ground / ore cells (terrain layer)
 *  - Grid lines
 *  - Buildings (mines, sell points)
 *  - Conveyors (direction arrows, item dots)
 *  - Hover highlight and selection highlight
 *
 * All colour values come from CONFIG.COLORS so they stay in sync with CSS.
 *
 * Extend by adding cases in drawBuilding() or drawConveyor().
 */

const Renderer = (() => {

  let canvas, ctx;
  const C = CONFIG.CELL_SIZE;

  // ── Init ───────────────────────────────────────
  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  /** Fit the canvas to the available wrapper space */
  function resize() {
    const wrapper = canvas.parentElement;
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }

  // ── Main draw call ─────────────────────────────
  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute visible cell range (full map is always shown; no pan/zoom yet)
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;

    // Centre the grid in the canvas
    const offsetX = Math.floor((canvas.width  - cols * C) / 2);
    const offsetY = Math.floor((canvas.height - rows * C) / 2);

    // Store offset so click handler can use it (accessed via Renderer.offset)
    Renderer.offsetX = offsetX;
    Renderer.offsetY = offsetY;

    // ── 1. Terrain layer ──
    drawTerrain(offsetX, offsetY);

    // ── 2. Grid lines ──
    drawGrid(offsetX, offsetY, cols, rows);

    // ── 3. Conveyors ──
    State.conveyors.forEach(c => drawConveyor(c, offsetX, offsetY));

    // ── 4. Buildings ──
    State.buildings.forEach(b => drawBuilding(b, offsetX, offsetY));

    // ── 5. Hover ──
    if (State.hoveredCell) {
      const { x, y } = State.hoveredCell;
      ctx.fillStyle = CONFIG.COLORS.HOVER;
      ctx.fillRect(offsetX + x * C, offsetY + y * C, C, C);
    }

    // ── 6. Selection ──
    if (State.selectedCell) {
      const { x, y } = State.selectedCell;
      ctx.strokeStyle = CONFIG.COLORS.ACCENT;
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX + x * C + 1, offsetY + y * C + 1, C - 2, C - 2);
    }
  }

  // ── Terrain ────────────────────────────────────
  function drawTerrain(ox, oy) {
    for (let y = 0; y < CONFIG.MAP_ROWS; y++) {
      for (let x = 0; x < CONFIG.MAP_COLS; x++) {
        const cell = State.grid[y][x];
        const px = ox + x * C;
        const py = oy + y * C;

        if (cell.terrain === 'ore') {
          // Base amber glow — intensity scales with richness
          const alpha = 0.12 + (cell.oreRichness / CONFIG.ORE_MAX_RICHNESS) * 0.35;
          ctx.fillStyle = CONFIG.COLORS.BG_CELL;
          ctx.fillRect(px, py, C, C);

          // Ore overlay
          ctx.fillStyle = `rgba(255,152,0,${alpha})`;
          ctx.fillRect(px, py, C, C);

          // Ore richness dot in corner
         
        } else {
          ctx.fillStyle = CONFIG.COLORS.BG_CELL;
          ctx.fillRect(px, py, C, C);
        }
      }
    }
  }



  // ── Grid lines ─────────────────────────────────
  function drawGrid(ox, oy, cols, rows) {
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth   = 0.5;
    ctx.beginPath();

    for (let x = 0; x <= cols; x++) {
      ctx.moveTo(ox + x * C, oy);
      ctx.lineTo(ox + x * C, oy + rows * C);
    }
    for (let y = 0; y <= rows; y++) {
      ctx.moveTo(ox,           oy + y * C);
      ctx.lineTo(ox + cols * C, oy + y * C);
    }
    ctx.stroke();
  }

  // ── Buildings ──────────────────────────────────
  function drawBuilding(b, ox, oy) {
    const px = ox + b.x * C;
    const py = oy + b.y * C;
    const pad = 3;

    switch (b.kind) {
      case CONFIG.BUILDING_TYPES.MINE:
        drawBuildingBase(px, py, CONFIG.COLORS.MINE_BG, CONFIG.COLORS.MINE, pad);
        drawCentredText(px, py, '⛏', 16);
        drawInventoryBar(px, py, b.inventory[CONFIG.ITEMS.IRON] || 0, CONFIG.MINE_CAPACITY, CONFIG.COLORS.MINE);
        break;

      case CONFIG.BUILDING_TYPES.SELL_POINT:
        drawBuildingBase(px, py, CONFIG.COLORS.SELL_BG, CONFIG.COLORS.SELL, pad);
        drawCentredText(px, py, '🏪', 15);
        drawInventoryBar(px, py, b.inventory[CONFIG.ITEMS.IRON] || 0, CONFIG.SELL_POINT_CAPACITY, CONFIG.COLORS.SELL);
        break;

      // Add new building kinds here
      default:
        drawBuildingBase(px, py, 'rgba(100,100,100,0.2)', '#aaa', pad);
        drawCentredText(px, py, '?', 14);
    }
  }

  function drawBuildingBase(px, py, bgColor, borderColor, pad) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(px + pad, py + pad, C - pad * 2, C - pad * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + pad, py + pad, C - pad * 2, C - pad * 2);
  }

  /** Draw emoji or text centred in a cell */
  function drawCentredText(px, py, text, size) {
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, px + C / 2, py + C / 2);
  }

  /** Thin horizontal fill bar at the bottom of a cell showing inventory fullness */
  function drawInventoryBar(px, py, current, max, color) {
    if (max <= 0) return;
    const barH = 3;
    const barW = C - 6;
    const fill = Math.min(1, current / max) * barW;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px + 3, py + C - barH - 2, barW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(px + 3, py + C - barH - 2, fill, barH);
  }

  // ── Conveyors ──────────────────────────────────
  function drawConveyor(conv, ox, oy) {
    const px = ox + conv.x * C;
    const py = oy + conv.y * C;

    // Background tint
    ctx.fillStyle = CONFIG.COLORS.CONVEYOR_BG;
    ctx.fillRect(px, py, C, C);

    // Direction arrow
    ctx.strokeStyle = CONFIG.COLORS.CONVEYOR;
    ctx.lineWidth   = 2;
    drawArrow(px, py, conv.dx, conv.dy);

    // Item dot if carrying something
    if (conv.item !== null) {
      ctx.beginPath();
      ctx.arc(px + C / 2, py + C / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.COLORS.ORE;
      ctx.fill();
    }
  }

  /**
   * Draw a simple directional arrow inside a cell.
   * dx/dy are the direction vector of the conveyor.
   */
  function drawArrow(px, py, dx, dy) {
    const cx = px + C / 2;
    const cy = py + C / 2;
    const len = C * 0.28;
    const hw  = C * 0.12; // head width half

    const ex = cx + dx * len;
    const ey = cy + dy * len;
    const sx = cx - dx * len;
    const sy = cy - dy * len;

    // Shaft
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Arrowhead (filled triangle)
    ctx.beginPath();
    if (dx !== 0) {
      // Horizontal arrow — head points left/right
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - dx * hw * 1.5, ey - hw);
      ctx.lineTo(ex - dx * hw * 1.5, ey + hw);
    } else {
      // Vertical arrow — head points up/down
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hw, ey - dy * hw * 1.5);
      ctx.lineTo(ex + hw, ey - dy * hw * 1.5);
    }
    ctx.closePath();
    ctx.fillStyle = CONFIG.COLORS.CONVEYOR;
    ctx.fill();
  }

  // ── Public API ─────────────────────────────────
  return {
    init,
    drawFrame,
    resize,
    offsetX: 0,
    offsetY: 0,

    /** Convert a canvas pixel position to grid cell coordinates */
    pixelToCell(px, py) {
      const gx = Math.floor((px - Renderer.offsetX) / C);
      const gy = Math.floor((py - Renderer.offsetY) / C);
      if (gx < 0 || gy < 0 || gx >= CONFIG.MAP_COLS || gy >= CONFIG.MAP_ROWS) return null;
      return { x: gx, y: gy };
    },
  };
})();
