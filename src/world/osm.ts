/**
 * Ownership: OSM bake load (`public/data/mesa-az.json`).
 * Talks via: parsed bake data. Do not build meshes here.
 * Budget: keep this file under ~300 lines.
 */

export const MESA_MAP_URL = '/data/mesa-az.json';

export type MesaBake = {
  meta: Record<string, unknown>;
  elevations: number[];
  roads: unknown[];
};

/** Stub. M1/M3 load the Jan Ave bake. */
export async function loadMesaBake(
  _url: string = MESA_MAP_URL,
): Promise<MesaBake> {
  return { meta: {}, elevations: [], roads: [] };
}
