/**
 * Ownership: local map of OSM + player.
 * Talks via: pose + bake summary. Do not import world/ mesh builders.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} Minimap
 * @property {(x: number, z: number, yaw: number) => void} render
 */

/** Stub. M3. @returns {Minimap} */
export function createMinimap() {
  return {
    render() {},
  };
}
