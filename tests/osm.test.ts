import { describe, expect, it } from 'vitest';
import mesa from '../public/data/mesa-az.json';
import { parseMesaBake } from '../src/world/osm';

describe('mesa bake loader', () => {
  it('parses the salvaged Jan Ave bake', () => {
    const bake = parseMesaBake(mesa);
    const grid = Number(bake.meta.grid);
    expect(grid).toBe(49);
    expect(bake.elevations).toHaveLength(grid * grid);
    expect(bake.roads.length).toBeGreaterThan(0);
    expect(bake.meta.origin).toMatchObject({
      lat: 33.38266,
      lon: -111.6668,
    });
  });

  it('rejects garbage', () => {
    expect(() => parseMesaBake(null)).toThrow(/mesa bake/);
    expect(() => parseMesaBake({ elevations: [] })).toThrow(/roads/);
  });
});
