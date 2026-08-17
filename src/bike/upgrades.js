/**
 * Ownership: scavenged bike mods (battery, armor, mounts, rack).
 * Talks via: events/state. Loot tables live elsewhere.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {string} UpgradeId
 */

/**
 * @typedef {object} UpgradeState
 * @property {UpgradeId[]} equipped
 */

/** @returns {UpgradeState} */
export function createUpgrades() {
  return { equipped: [] };
}

/** Stub. M4. @param {UpgradeState} state @param {UpgradeId} _id @returns {UpgradeState} */
export function equipUpgrade(state, _id) {
  return state;
}
