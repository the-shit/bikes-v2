/**
 * Ownership: scavenged parts + throwable ammo. Per-rider pockets.
 * Talks via: Bag counts. Bike upgrades consume these at the garage.
 * Budget: keep this file under ~300 lines.
 */

export type Bag = {
  cells: number;
  plates: number;
  mounts: number;
  straps: number;
  rocks: number;
  balloons: number;
  bands: number;
};

export const BAG = {
  cap: 8,
  rackBonus: 8,
} as const;

export function createBag(opts: Partial<Bag> = {}): Bag {
  return {
    cells: opts.cells ?? 0,
    plates: opts.plates ?? 0,
    mounts: opts.mounts ?? 0,
    straps: opts.straps ?? 0,
    rocks: opts.rocks ?? 0,
    balloons: opts.balloons ?? 0,
    bands: opts.bands ?? 0,
  };
}

export function bagTotal(bag: Bag): number {
  return (
    bag.cells +
    bag.plates +
    bag.mounts +
    bag.straps +
    bag.rocks +
    bag.balloons +
    bag.bands
  );
}

export function bagCap(racked: boolean): number {
  return BAG.cap + (racked ? BAG.rackBonus : 0);
}

export function addToBag(bag: Bag, add: Partial<Bag>, cap: number): Bag {
  const next = { ...bag };
  const keys = Object.keys(add) as (keyof Bag)[];
  let room = Math.max(0, cap - bagTotal(next));
  for (const key of keys) {
    const want = Math.max(0, Math.floor(add[key] ?? 0));
    const take = Math.min(want, room);
    next[key] += take;
    room -= take;
  }
  return next;
}

export function takeFromBag(bag: Bag, cost: Partial<Bag>): Bag | null {
  const next = { ...bag };
  for (const key of Object.keys(cost) as (keyof Bag)[]) {
    const n = Math.max(0, Math.floor(cost[key] ?? 0));
    if (next[key] < n) {
      return null;
    }
    next[key] -= n;
  }
  return next;
}
