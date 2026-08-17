/**
 * Ownership: heightfield / ground mesh from the bake.
 * Talks via: sampled height. Do not import bike/ or combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

export type Terrain = {
  sampleHeight(x: number, z: number): number;
};

/** Stub. M3. */
export function createTerrain(): Terrain {
  return {
    sampleHeight() {
      return 0;
    },
  };
}
