/**
 * Ownership: per-zombie chase / wander / attack decisions.
 * Talks via: events/state. Reads bike pose from state, not bike/ internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} ZombieAi
 * @property {string} kind
 * @property {number} x
 * @property {number} z
 */

/** Stub. M1. @param {ZombieAi} state @param {number} _dt @returns {ZombieAi} */
export function stepZombieAi(state, _dt) {
  return state;
}
