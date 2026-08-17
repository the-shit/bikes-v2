/**
 * Ownership: timed melee swings from the saddle.
 * Talks via: events/state. Do not import zombies/ AI internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} MeleeState
 * @property {number} cooldown
 */

/** @returns {MeleeState} */
export function createMelee() {
  return { cooldown: 0 };
}

/** Stub. M1. @param {MeleeState} state @param {number} _dt @returns {MeleeState} */
export function stepMelee(state, _dt) {
  return state;
}
