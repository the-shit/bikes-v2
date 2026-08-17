import { describe, expect, it } from 'vitest';
import { bagTotal, createBag } from '../src/bike/bag';
import { housesFromSpots, rollLoot, scavenge } from '../src/world/loot';

describe('loot houses', () => {
  const spots = [
    { id: 'loot-0', kind: 'loot' as const, x: 4, z: 2, yaw: 0, label: 'Porch' },
    { id: 'jump-1', kind: 'jump' as const, x: 0, z: 0, yaw: 0, label: 'k' },
  ];

  it('only marks loot spots as houses', () => {
    const houses = housesFromSpots(spots);
    expect(houses).toHaveLength(1);
    expect(houses[0].looted).toBe(false);
  });

  it('scavenge is deterministic per house and one-shot', () => {
    const house = housesFromSpots(spots)[0];
    const a = scavenge(house, createBag(), 16);
    const b = scavenge(house, createBag(), 16);
    expect(a.bag).toEqual(b.bag);
    expect(bagTotal(a.bag)).toBeGreaterThan(0);
    const again = scavenge(a.house, a.bag, 16);
    expect(again.toast).toMatch(/Picked clean/);
    expect(again.bag).toEqual(a.bag);
  });

  it('same id always rolls the same porch haul', () => {
    expect(rollLoot('loot-0')).toEqual(rollLoot('loot-0'));
    expect(rollLoot('loot-1')).not.toEqual(rollLoot('loot-0'));
  });

  it('does not mark the house looted when the bag cannot take the drop', () => {
    const house = housesFromSpots(spots)[0];
    const stuffed = createBag({
      cells: 2,
      plates: 2,
      rocks: 2,
      balloons: 2,
    });
    expect(bagTotal(stuffed)).toBe(8);
    const full = scavenge(house, stuffed, 8);
    expect(full.house.looted).toBe(false);
    expect(full.bag).toEqual(stuffed);
    expect(full.toast).toMatch(/Pockets full/);
  });
});
