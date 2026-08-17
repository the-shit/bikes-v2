import { describe, expect, it } from 'vitest';
import mesa from '../public/data/mesa-az.json';
import { parseMesaBake } from '../src/world/osm';
import { buildJanSlice } from '../src/world/slice';
import { findJanRoads } from '../src/world/jan';

describe('Jan Ave slice', () => {
  const bake = parseMesaBake(mesa);

  it('finds East Jan Avenue in the mesa bake', () => {
    const jan = findJanRoads(bake.roads);
    expect(jan.length).toBeGreaterThan(0);
    expect(jan.some((r) => (r.name || '').includes('Jan'))).toBe(true);
  });

  it('builds a home + carport spawn on the north lot', () => {
    const slice = buildJanSlice(bake);
    expect(slice.jan).not.toBeNull();
    expect(slice.nearbyRoads.length).toBeGreaterThan(0);
    expect(slice.lots.length).toBeGreaterThan(0);
    expect(slice.shamblerPins.length).toBeGreaterThan(0);
    expect(slice.home.z).toBeLessThan(30);
    expect(Math.hypot(slice.spawn.x - slice.home.x, slice.spawn.z - slice.home.z)).toBeGreaterThan(
      4,
    );
  });
});
