/**
 * game.js — Entry point and game loop.
 *
 * Responsibilities:
 *  - Initialise all subsystems in the correct order
 *  - Run the game tick on an interval (buildings → conveyors)
 *  - Run the render loop via requestAnimationFrame
 *  - Expose restartTicker() so UI can adjust speed
 *
 * Tick order (important for correct chain behaviour):
 *  1. Buildings.tickAll()  — mines produce; sell points sell
 *  2. Conveyors.tickAll()  — items move one step forward
 *
 * Render loop runs independently of the tick so the canvas is always smooth.
 */

const Game = (() => {

  let _tickInterval = null;

  // ── Tick ───────────────────────────────────────
  function tick() {
    if (State.paused) return;

    State.incrementTick();
    Buildings.tickAll();
    Conveyors.tickAll();
    UI.updateResources();
  }

  /** (Re)start the tick interval based on current speed setting */
  function restartTicker() {
    if (_tickInterval !== null) {
      clearInterval(_tickInterval);
      _tickInterval = null;
    }
    if (State.paused) return;

    const speed = CONFIG.SPEED_LEVELS[State.speedIdx];
    const ms    = Math.round(CONFIG.BASE_TICK_MS / speed);
    _tickInterval = setInterval(tick, ms);
  }

  // ── Render loop ────────────────────────────────
  function renderLoop() {
    Renderer.drawFrame();
    requestAnimationFrame(renderLoop);
  }

  // ── Init ───────────────────────────────────────
  function init() {
    // 1. Generate map
    const grid = MapGen.generate();
    State.setGrid(grid);

    // 2. Init renderer (sets canvas size)
    const canvas = document.getElementById('game-canvas');
    Renderer.init(canvas);

    // 3. Init UI (wire DOM)
    UI.init();

    // 4. Start tick loop
    restartTicker();

    // 5. Start render loop
    renderLoop();

    UI.log('Map generated. Place a Mine on an ore vein, then connect Conveyors to a Sell Point.');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ─────────────────────────────────
  return {
    restartTicker,
    tick, // exposed for debugging
  };
})();
