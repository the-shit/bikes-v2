/**
 * Ownership: fixed-timestep sim clock + frame FPS.
 * Talks via: tick/render callbacks. Do not import bike/world/combat internals.
 * Budget: keep this file under ~300 lines.
 */

export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.05;
export const MAX_STEPS = 5;
export const FPS_WINDOW = 0.5;

/**
 * @typedef {object} LoopState
 * @property {number} accumulator
 * @property {number} simTime
 * @property {number} fps
 * @property {number} frames
 * @property {number} fpsWindow
 */

/**
 * @typedef {object} LoopHandlers
 * @property {(dt: number) => void} tick
 * @property {(alpha: number, state: LoopState) => void} render
 */

/** @returns {LoopState} */
export function createLoop() {
  return {
    accumulator: 0,
    simTime: 0,
    fps: 0,
    frames: 0,
    fpsWindow: 0,
  };
}

/**
 * @param {LoopState} state
 * @param {number} frameDt
 * @param {LoopHandlers} handlers
 * @returns {LoopState}
 */
export function advanceLoop(state, frameDt, handlers) {
  const dt = Math.min(MAX_FRAME_DT, Math.max(0, frameDt));
  state.accumulator += dt;
  state.fpsWindow += dt;
  state.frames += 1;
  if (state.fpsWindow >= FPS_WINDOW) {
    state.fps = state.frames / state.fpsWindow;
    state.frames = 0;
    state.fpsWindow = 0;
  }

  let steps = 0;
  while (state.accumulator >= FIXED_DT && steps < MAX_STEPS) {
    handlers.tick(FIXED_DT);
    state.accumulator -= FIXED_DT;
    state.simTime += FIXED_DT;
    steps += 1;
  }
  if (steps === MAX_STEPS) {
    state.accumulator = 0;
  }

  const alpha = state.accumulator / FIXED_DT;
  handlers.render(alpha, state);
  return state;
}
