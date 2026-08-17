/**
 * Ownership: tire pressure, flats, tubes/patches.
 * Talks via: events/state. Hazards come from world/, not imported.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} TireState
 * @property {number} pressure
 * @property {boolean} flat
 * @property {number} tubes
 * @property {number} patches
 */

/** @returns {TireState} */
export function createTires() {
  return { pressure: 1, flat: false, tubes: 1, patches: 2 };
}

/** Stub. M2 ports v1 feel constants after evaluation. @param {TireState} state @param {number} _dt @returns {TireState} */
export function stepTires(state, _dt) {
  return state;
}
