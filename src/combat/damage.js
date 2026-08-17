/**
 * Ownership: health / hit resolution for anything that can break.
 * Talks via: events/state. Callers pass ids, not foreign objects.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} Health
 * @property {number} hp
 * @property {number} max
 */

/** @param {number} [max] @returns {Health} */
export function createHealth(max = 1) {
  return { hp: max, max };
}

/** Stub. M1. @param {Health} health @param {number} amount @returns {Health} */
export function applyDamage(health, amount) {
  const hp = Math.max(0, health.hp - amount);
  return { ...health, hp };
}
