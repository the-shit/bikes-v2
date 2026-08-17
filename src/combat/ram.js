/**
 * Ownership: bike-as-weapon ram / stomp / slam damage.
 * Talks via: events/state. Speed → damage. No zombie internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} RamHit
 * @property {number} damage
 */

/** Stub. M1. @param {number} _speed @returns {RamHit} */
export function ramDamage(_speed) {
  return { damage: 0 };
}
