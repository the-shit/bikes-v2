/**
 * Ownership: debug FPS readout. Not the play HUD.
 * Talks via: LoopState.fps. Do not import gameplay systems.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} FpsHud
 * @property {(fps: number) => void} update
 */

/**
 * @param {HTMLElement} el
 * @returns {FpsHud}
 */
export function createFpsHud(el) {
  return {
    update(fps) {
      const shown = fps > 0 ? fps.toFixed(0) : '—';
      el.textContent = `${shown} fps`;
    },
  };
}
