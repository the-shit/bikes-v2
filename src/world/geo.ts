/**
 * Ownership: local ENU frame + elevation sample + road helpers.
 * Talks via: bake numbers. Do not build meshes here.
 * Budget: keep this file under ~300 lines.
 */

export const M_PER_DEG_LAT = 111_320;

export type ElevMap = {
  halfExtentM: number;
  grid: number;
  elevations: number[];
  verticalScale?: number;
  originRel?: number;
};

export type RoadPoly = {
  id?: number;
  highway: string;
  name: string | null;
  points: number[][];
};

export function metersPerDegLon(latDeg: number): number {
  return M_PER_DEG_LAT * Math.cos((latDeg * Math.PI) / 180);
}

export function sampleElevGrid(x: number, z: number, map: ElevMap): number {
  const half = map.halfExtentM;
  const u = (x + half) / (half * 2);
  const v = (z + half) / (half * 2);
  const cu = Math.max(0, Math.min(1, u));
  const cv = Math.max(0, Math.min(1, v));
  return sampleUV(cu, cv, map);
}

function sampleUV(u: number, v: number, map: ElevMap): number {
  const n = map.grid;
  const fx = u * (n - 1);
  const fz = v * (n - 1);
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(n - 1, x0 + 1);
  const z1 = Math.min(n - 1, z0 + 1);
  const tx = fx - x0;
  const tz = fz - z0;
  const e00 = map.elevations[z0 * n + x0] ?? 0;
  const e10 = map.elevations[z0 * n + x1] ?? 0;
  const e01 = map.elevations[z1 * n + x0] ?? 0;
  const e11 = map.elevations[z1 * n + x1] ?? 0;
  const e0 = e00 * (1 - tx) + e10 * tx;
  const e1 = e01 * (1 - tx) + e11 * tx;
  const rel = e0 * (1 - tz) + e1 * tz;
  const scale = map.verticalScale ?? 1.6;
  return (rel - originRel(map)) * scale;
}

function originRel(map: ElevMap): number {
  if (map.originRel != null) {
    return map.originRel;
  }
  const n = map.grid;
  const mid = Math.floor(n / 2);
  map.originRel = map.elevations[mid * n + mid] ?? 0;
  return map.originRel;
}

export function roadWidth(highway: string): number {
  switch (highway) {
    case 'primary':
      return 12;
    case 'secondary':
      return 10;
    case 'tertiary':
      return 8.5;
    case 'residential':
    case 'unclassified':
      return 7;
    case 'service':
      return 5;
    default:
      return 6;
  }
}

export function spawnOnNearestRoad(roads: RoadPoly[]): {
  x: number;
  z: number;
  yaw: number;
  roadName: string;
} {
  let best: { x: number; z: number; yaw: number; roadName: string } | null =
    null;
  let bestD = Infinity;
  for (const road of roads) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, (-x0 * dx + -z0 * dz) / len2));
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      const d = Math.hypot(px, pz);
      if (d < bestD) {
        bestD = d;
        best = {
          x: px,
          z: pz,
          yaw: Math.atan2(dx, dz),
          roadName: road.name || road.highway,
        };
      }
    }
  }
  return best ?? { x: 0, z: 0, yaw: 0, roadName: 'unknown' };
}
