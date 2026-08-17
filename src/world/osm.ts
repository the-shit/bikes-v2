/**
 * Ownership: OSM bake load (`public/data/mesa-az.json`).
 * Talks via: parsed bake data. Do not build meshes here.
 * Budget: keep this file under ~300 lines.
 */

import type { RoadPoly } from './geo';

export const MESA_MAP_URL = '/data/mesa-az.json';

export type MesaOrigin = {
  lat: number;
  lon: number;
  label?: string;
};

export type MesaBake = {
  meta: {
    grid: number;
    halfExtentM: number;
    origin: MesaOrigin;
    [key: string]: unknown;
  };
  elevations: number[];
  elevMin: number;
  roads: RoadPoly[];
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
  const metaIn =
    rec.meta && typeof rec.meta === 'object'
      ? (rec.meta as Record<string, unknown>)
      : {};
  const originRaw =
    metaIn.origin && typeof metaIn.origin === 'object'
      ? (metaIn.origin as Record<string, unknown>)
      : {};
  const roads: RoadPoly[] = rec.roads.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const points = Array.isArray(r.points)
      ? (r.points as number[][]).filter(
          (p) => Array.isArray(p) && p.length >= 2,
        )
      : [];
    return {
      id: typeof r.id === 'number' ? r.id : undefined,
      highway: typeof r.highway === 'string' ? r.highway : 'residential',
      name: typeof r.name === 'string' ? r.name : null,
      points,
    };
  });
  return {
    meta: {
      ...metaIn,
      grid: Number(metaIn.grid) || 0,
      halfExtentM: Number(metaIn.halfExtentM) || 900,
      origin: {
        lat: Number(originRaw.lat) || 0,
        lon: Number(originRaw.lon) || 0,
        label: typeof originRaw.label === 'string' ? originRaw.label : undefined,
      },
    },
    elevations: rec.elevations as number[],
    elevMin: Number(rec.elevMin ?? metaIn.elevMin) || 0,
    roads,
  };
}

export async function loadMesaBake(
  url: string = MESA_MAP_URL,
): Promise<MesaBake> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`mesa bake: HTTP ${res.status}`);
  }
  return parseMesaBake(await res.json());
}
