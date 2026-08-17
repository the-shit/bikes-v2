/**
 * Ownership: bike momentum, lean, traction.
 * Talks via: events/state. Do not import combat/ or zombies/ internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} BikeState
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} yaw
 * @property {number} speed
 */

/** @returns {BikeState} */
export function createBikeState() {
  return { x: 0, y: 0, z: 0, yaw: 0, speed: 0 };
}

/** Stub. M1 owns ride feel. @param {BikeState} state @param {number} _dt @returns {BikeState} */
export function stepBike(state, _dt) {
  return state;
}
