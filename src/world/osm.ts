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

export function parseMesaBake(data: unknown): MesaBake {
  if (!data || typeof data !== 'object') {
    throw new Error('mesa bake: expected object');
  }
  const rec = data as Record<string, unknown>;
  if (!Array.isArray(rec.elevations)) {
    throw new Error('mesa bake: elevations');
  }
  if (!Array.isArray(rec.roads)) {
    throw new Error('mesa bake: roads');
  }
  const meta =
    rec.meta && typeof rec.meta === 'object'
      ? (rec.meta as Record<string, unknown>)
      : {};
  return {
    meta,
    elevations: rec.elevations as number[],
    roads: rec.roads,
  };
}

/** Stub fetch. Parse the bake with parseMesaBake once M1/M3 load over HTTP. */
export async function loadMesaBake(
  _url: string = MESA_MAP_URL,
): Promise<MesaBake> {
  return { meta: {}, elevations: [], roads: [] };
}
