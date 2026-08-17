/**
 * Ownership: pre/post apocalypse flip state (lighting, props, audio).
 * Talks via: FlipState events. One world, two skins.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {'pre' | 'turning' | 'post'} FlipPhase
 */

/**
 * @typedef {object} FlipState
 * @property {FlipPhase} phase
 */

/** @returns {FlipState} */
export function createFlip() {
  return { phase: 'pre' };
}

/** Stub. M3. @param {FlipState} state @param {number} _dt @returns {FlipState} */
export function stepFlip(state, _dt) {
  return state;
}
