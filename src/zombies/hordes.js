/**
 * Ownership: grouped pressure (packs, waves) after the flip.
 * Talks via: events/state. Individual AI stays in ai.js.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} HordeState
 * @property {number} pressure
 */

/** @returns {HordeState} */
export function createHorde() {
  return { pressure: 0 };
}

/** Stub. M4. @param {HordeState} state @param {number} _dt @returns {HordeState} */
export function stepHorde(state, _dt) {
  return state;
}
