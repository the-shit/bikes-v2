/**
 * Ownership: scavenged bike mods (battery, armor, mounts, rack).
 * Talks via: events/state. Loot tables live elsewhere.
 * Budget: keep this file under ~300 lines.
 */

export type UpgradeId = string;

export type UpgradeState = {
  equipped: UpgradeId[];
};

export function createUpgrades(): UpgradeState {
  return { equipped: [] };
}

/** Stub. M4. */
export function equipUpgrade(state: UpgradeState, _id: UpgradeId): UpgradeState {
  return state;
}
