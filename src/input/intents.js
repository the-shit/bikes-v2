/**
 * Ownership: semantic player intents. Adapters map devices onto this shape.
 * Talks via: Intent values. Gameplay must not read KeyboardEvent directly.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} Intent
 * @property {number} throttle
 * @property {number} steer
 * @property {number} brake
 * @property {number} lookX
 * @property {number} lookY
 * @property {boolean} fire
 * @property {boolean} melee
 * @property {boolean} mount
 */

/** @returns {Intent} */
export function idleIntent() {
  return {
    throttle: 0,
    steer: 0,
    brake: 0,
    lookX: 0,
    lookY: 0,
    fire: false,
    melee: false,
    mount: false,
  };
}

/**
 * @param {number} value
 * @returns {number}
 */
export function clampAxis(value) {
  if (value > 1) {
    return 1;
  }
  if (value < -1) {
    return -1;
  }
  return value;
}
