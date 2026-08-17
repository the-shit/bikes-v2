/**
 * Ownership: heightfield / ground mesh from the bake.
 * Talks via: sampled height. Do not import bike/ or combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} Terrain
 * @property {(x: number, z: number) => number} sampleHeight
 */

/** Stub. M3. @returns {Terrain} */
export function createTerrain() {
  return {
    sampleHeight() {
      return 0;
    },
  };
}
