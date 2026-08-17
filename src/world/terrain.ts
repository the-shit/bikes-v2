/**
 * Ownership: heightfield / ground sample from the bake.
 * Talks via: sampled height. Do not import bike/ or combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

import { sampleElevGrid, type ElevMap } from './geo';
import type { MesaBake } from './osm';

export type Terrain = {
  sampleHeight(x: number, z: number): number;
  map: ElevMap;
};

export function createTerrain(bake?: MesaBake, verticalScale = 1.6): Terrain {
  if (!bake) {
    return {
      map: { halfExtentM: 1, grid: 1, elevations: [0] },
      sampleHeight() {
        return 0;
      },
    };
  }
  const map: ElevMap = {
    halfExtentM: bake.meta.halfExtentM,
    grid: bake.meta.grid,
    elevations: bake.elevations,
    verticalScale,
  };
  return {
    map,
    sampleHeight(x, z) {
      return sampleElevGrid(x, z, map);
    },
  };
}
