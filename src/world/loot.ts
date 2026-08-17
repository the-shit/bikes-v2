/**
 * Ownership: loot-house poses + scavenge. Dismount to rummage.
 * Talks via: LootHouse. Bag lives on the rider; this only fills it.
 * Budget: keep this file under ~300 lines.
 */

import { addToBag, type Bag } from '../bike/bag';
import type { CuratedSpot } from './curation';

export type LootHouse = {
  id: string;
  x: number;
  z: number;
  r: number;
  looted: boolean;
};

export const LOOT = {
  radius: 3.4,
} as const;

export function housesFromSpots(
  spots: readonly CuratedSpot[],
): LootHouse[] {
  return spots
    .filter((s) => s.kind === 'loot')
    .map((s) => ({
      id: s.id,
      x: s.x,
      z: s.z,
      r: LOOT.radius,
      looted: false,
    }));
}

export function nearLoot(
  x: number,
  z: number,
  houses: readonly LootHouse[],
): LootHouse | null {
  let best: LootHouse | null = null;
  let bestD = Infinity;
  for (const h of houses) {
    const d = Math.hypot(x - h.x, z - h.z);
    if (d <= h.r && d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

export function scavenge(
  house: LootHouse,
  bag: Bag,
  cap: number,
): { house: LootHouse; bag: Bag; toast: string } {
  if (house.looted) {
    return { house, bag, toast: 'Picked clean' };
  }
  const drop = rollLoot(house.id);
  const { bag: next, taken } = addToBag(bag, drop, cap);
  const got = summarize(taken);
  const rolled = summarize(drop);
  if (!got && rolled) {
    return { house, bag, toast: 'Pockets full' };
  }
  return {
    house: { ...house, looted: true },
    bag: next,
    toast: got ? `Porch haul — ${got}` : 'Just dust bunnies',
  };
}

export function rollLoot(id: string): Partial<Bag> {
  const n = hash(id);
  const drop: Partial<Bag> = {
    rocks: 2 + (n % 3),
    balloons: n % 2,
  };
  if (n % 3 === 0) {
    drop.cells = 2;
  }
  if (n % 3 === 1) {
    drop.plates = 2;
  }
  if (n % 3 === 2) {
    drop.straps = 2;
  }
  if (n % 5 === 0) {
    drop.mounts = 2;
  }
  if (n % 4 === 1) {
    drop.bands = 2;
  }
  return drop;
}

function summarize(drop: Partial<Bag>): string {
  const bits: string[] = [];
  const names: Record<keyof Bag, string> = {
    cells: 'cells',
    plates: 'plates',
    mounts: 'brackets',
    straps: 'straps',
    rocks: 'rocks',
    balloons: 'balloons',
    bands: 'bands',
  };
  for (const key of Object.keys(names) as (keyof Bag)[]) {
    const n = drop[key] ?? 0;
    if (n > 0) {
      bits.push(`${n} ${names[key]}`);
    }
  }
  return bits.join(', ');
}

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
