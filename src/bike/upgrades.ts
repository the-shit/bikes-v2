/**
 * Ownership: scavenged bike mods (battery, armor, mounts, rack).
 * Talks via: UpgradeState on WorldBike. Costs live as Bag slices.
 * Budget: keep this file under ~300 lines.
 */

import type { Bag } from './bag';
import { takeFromBag } from './bag';

export type UpgradeId = 'battery' | 'armor' | 'mount' | 'rack';

export type UpgradeState = {
  equipped: UpgradeId[];
};

export const UPGRADE_COST: Record<UpgradeId, Partial<Bag>> = {
  battery: { cells: 3 },
  armor: { plates: 3 },
  mount: { mounts: 2 },
  rack: { straps: 2 },
};

export const UPGRADE_LABEL: Record<UpgradeId, string> = {
  battery: 'Bigger pack',
  armor: 'Frame plates',
  mount: 'Weapon mount',
  rack: 'Cargo rack',
};

export const UPGRADE_ORDER: readonly UpgradeId[] = [
  'battery',
  'armor',
  'mount',
  'rack',
];

export function createUpgrades(
  equipped: readonly UpgradeId[] = [],
): UpgradeState {
  return { equipped: [...equipped] };
}

export function hasUpgrade(state: UpgradeState, id: UpgradeId): boolean {
  return state.equipped.includes(id);
}

export function drainScale(state: UpgradeState): number {
  return hasUpgrade(state, 'battery') ? 0.62 : 1;
}

export function armorMaxHp(state: UpgradeState): number {
  return hasUpgrade(state, 'armor') ? 5 : 3;
}

export function armorReduce(state: UpgradeState, amount: number): number {
  const raw = Math.max(0, amount);
  return hasUpgrade(state, 'armor') ? Math.max(1, raw - 1) : raw;
}

export function ramScale(state: UpgradeState): number {
  return hasUpgrade(state, 'mount') ? 1.15 : 1;
}

export function nextUpgrade(
  state: UpgradeState,
  bag: Bag,
): UpgradeId | null {
  for (const id of UPGRADE_ORDER) {
    if (hasUpgrade(state, id)) {
      continue;
    }
    if (takeFromBag(bag, UPGRADE_COST[id])) {
      return id;
    }
  }
  return null;
}

export function equipUpgrade(
  state: UpgradeState,
  id: UpgradeId,
): UpgradeState {
  if (hasUpgrade(state, id)) {
    return state;
  }
  return { equipped: [...state.equipped, id] };
}

export function tryEquip(
  state: UpgradeState,
  bag: Bag,
  id: UpgradeId,
): { upgrades: UpgradeState; bag: Bag; toast: string } | null {
  if (hasUpgrade(state, id)) {
    return null;
  }
  const paid = takeFromBag(bag, UPGRADE_COST[id]);
  if (!paid) {
    return null;
  }
  return {
    upgrades: equipUpgrade(state, id),
    bag: paid,
    toast: `Bolted on — ${UPGRADE_LABEL[id]}`,
  };
}
