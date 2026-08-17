/**
 * Ownership: hand-placed play spaces on the OSM backbone.
 * Talks via: curated markers (jumps, loot, charge). Not raw OSM.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} CuratedSpot
 * @property {string} id
 * @property {'jump' | 'loot' | 'charge' | 'choke'} kind
 * @property {number} x
 * @property {number} z
 */

/** Stub. M3. @returns {CuratedSpot[]} */
export function curatedSpots() {
  return [];
}
