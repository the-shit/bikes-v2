/**
 * Ownership: OSM bake load (`public/data/mesa-az.json`).
 * Talks via: parsed bake data. Do not build meshes here.
 * Budget: keep this file under ~300 lines.
 */

export const MESA_MAP_URL = '/data/mesa-az.json';

/**
 * @typedef {object} MesaBake
 * @property {Record<string, unknown>} meta
 * @property {number[]} elevations
 * @property {unknown[]} roads
 */

/**
 * Stub. M1/M3 load the Jan Ave bake.
 * @param {string} [_url]
 * @returns {Promise<MesaBake>}
 */
export async function loadMesaBake(_url = MESA_MAP_URL) {
  return { meta: {}, elevations: [], roads: [] };
}
