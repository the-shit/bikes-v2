/**
 * Ownership: lots along named residential streets (Jan stays bespoke).
 * Talks via: JanLot[]. View dresses these; sim does not collide yet.
 * Budget: keep this file under ~300 lines.
 */

import { roadWidth, type RoadPoly } from './geo';
import { type JanLot } from './jan';

export const HOOD = {
  maxLots: 120,
  homeKeepout: 36,
  pitch: 30,
  setback: 16,
  maxRange: 780,
} as const;

const LOT_HIGHWAYS = new Set([
  'residential',
  'unclassified',
  'tertiary',
  'living_street',
]);

export function layoutHoodLots(
  roads: readonly RoadPoly[],
  home: { x: number; z: number },
  max = HOOD.maxLots,
): JanLot[] {
  const lots: JanLot[] = [];
  for (const road of roads) {
    if (lots.length >= max) {
      break;
    }
    if (!LOT_HIGHWAYS.has(road.highway)) {
      continue;
    }
    if ((road.name || '').toLowerCase().includes('jan')) {
      continue;
    }
    const pts = road.points;
    if (pts.length < 2) {
      continue;
    }
    for (let i = 1; i < pts.length && lots.length < max; i += 1) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const seg = Math.hypot(x1 - x0, z1 - z0);
      if (seg < 14) {
        continue;
      }
      const steps = Math.max(1, Math.floor(seg / HOOD.pitch));
      const dirX = (x1 - x0) / seg;
      const dirZ = (z1 - z0) / seg;
      const px = -dirZ;
      const pz = dirX;
      for (let s = 0; s < steps && lots.length < max; s += 1) {
        const t = (s + 0.5) / steps;
        const cx = x0 + (x1 - x0) * t;
        const cz = z0 + (z1 - z0) * t;
        if (Math.hypot(cx, cz) > HOOD.maxRange) {
          continue;
        }
        const side = (lots.length + i + s) % 2 === 0 ? 1 : -1;
        const x = cx + px * side * HOOD.setback;
        const z = cz + pz * side * HOOD.setback;
        if (Math.hypot(x - home.x, z - home.z) < HOOD.homeKeepout) {
          continue;
        }
        if (!clearOfRoads(x, z, roads, 4.2)) {
          continue;
        }
        lots.push({
          x,
          z,
          yaw: Math.atan2(cx - x, cz - z),
          palm: {
            x: cx + px * side * 8.5 + dirX * 5,
            z: cz + pz * side * 8.5 + dirZ * 5,
          },
        });
      }
    }
  }
  return lots;
}

export function clearOfRoads(
  x: number,
  z: number,
  roads: readonly RoadPoly[],
  footR: number,
  pad = 2,
): boolean {
  for (const road of roads) {
    const half = roadWidth(road.highway) * 0.5 + pad;
    for (let i = 1; i < road.points.length; i += 1) {
      const [x0, z0] = road.points[i - 1];
      const [x1, z1] = road.points[i];
      if (pointSegDist(x, z, x0, z0, x1, z1) < half + footR) {
        return false;
      }
    }
  }
  return true;
}

function pointSegDist(
  x: number,
  z: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
  return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
}
