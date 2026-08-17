/**
 * Ownership: debug FPS readout. Not the play HUD.
 * Talks via: LoopState.fps. Do not import gameplay systems.
 * Budget: keep this file under ~300 lines.
 */

export type FpsHud = {
  update(fps: number): void;
};

export function createFpsHud(el: HTMLElement): FpsHud {
  return {
    update(fps) {
      const shown = fps > 0 ? fps.toFixed(0) : '—';
      el.textContent = `${shown} fps`;
    },
  };
}
