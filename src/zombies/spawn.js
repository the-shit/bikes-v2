/**
 * Ownership: where and when zombies enter the world.
 * Talks via: entity ids + events. Do not import combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} SpawnRequest
 * @property {number} x
 * @property {number} z
 * @property {string} kind
 */

/** Stub. M1 (one type) then M4 (variety). @param {number} _dt @returns {SpawnRequest[]} */
export function nextSpawns(_dt) {
  return [];
}
