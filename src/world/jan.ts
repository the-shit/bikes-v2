/**
 * Ownership: East Jan Avenue segment + neighbor lot pads.
 * Talks via: road/lot markers. Not raw OSM fetch.
 * Budget: keep this file under ~300 lines.
 */

import type { RoadPoly } from './geo';

export type JanLot = {
  x: number;
  z: number;
  yaw: number;
  palm: { x: number; z: number };
};

export const JAN_LOT_DEFAULTS = {
  pitch: 24,
  setback: 16,
  homeKeepout: 13,
  endKeepout: 16,
} as const;

export function findJanRoads(roads: RoadPoly[]): RoadPoly[] {
  return roads.filter(
    (r) =>
      (r.name || '').toLowerCase().includes('jan') &&
      r.points &&
      r.points.length >= 2,
  );
}

export function findHomeJanRoad(
  roads: RoadPoly[],
  home: { x: number; z: number },
): RoadPoly | null {
  let best: RoadPoly | null = null;
  let bestD = Infinity;
  for (const road of findJanRoads(roads)) {
    for (const [x, z] of road.points) {
      const d = Math.hypot(x - home.x, z - home.z);
      if (d < bestD) {
        bestD = d;
        best = road;
      }
    }
  }
  return best;
}

export function roadsNear(
  roads: RoadPoly[],
  origin: { x: number; z: number },
  radius: number,
): RoadPoly[] {
  return roads.filter((r) =>
    r.points.some(([x, z]) => Math.hypot(x - origin.x, z - origin.z) <= radius),
  );
}

export function layoutJanLots(
  road: RoadPoly,
  home: { x: number; z: number },
  opts: Partial<typeof JAN_LOT_DEFAULTS> = {},
): JanLot[] {
  const cfg = { ...JAN_LOT_DEFAULTS, ...opts };
  const segs: {
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    len: number;
    start: number;
  }[] = [];
  let total = 0;
  const pts = road.points;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, z0] = pts[i - 1];
    const [x1, z1] = pts[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 1e-6) {
      continue;
    }
    segs.push({ x0, z0, x1, z1, len, start: total });
    total += len;
  }
  if (!segs.length) {
    return [];
  }

  const at = (dist: number) => {
    let s = segs[segs.length - 1];
    for (const seg of segs) {
      if (dist <= seg.start + seg.len) {
        s = seg;
        break;
      }
    }
    const t = Math.max(0, Math.min(1, (dist - s.start) / s.len));
    const dirX = (s.x1 - s.x0) / s.len;
    const dirZ = (s.z1 - s.z0) / s.len;
    return {
      x: s.x0 + (s.x1 - s.x0) * t,
      z: s.z0 + (s.z1 - s.z0) * t,
      dirX,
      dirZ,
    };
  };

  const lots: JanLot[] = [];
  for (
    let d = cfg.endKeepout + cfg.pitch / 2;
    d <= total - cfg.endKeepout - cfg.pitch / 2;
    d += cfg.pitch
  ) {
    const p = at(d);
    const px = -p.dirZ;
    const pz = p.dirX;
    for (const side of [1, -1] as const) {
      const x = p.x + px * side * cfg.setback;
      const z = p.z + pz * side * cfg.setback;
      if (Math.hypot(x - home.x, z - home.z) < cfg.homeKeepout) {
        continue;
      }
      lots.push({
        x,
        z,
        yaw: Math.atan2(p.x - x, p.z - z),
        palm: {
          x: p.x + px * side * 8.5 + p.dirX * 6,
          z: p.z + pz * side * 8.5 + p.dirZ * 6,
        },
      });
    }
  }
  return lots;
}

export function janStreetPoints(
  road: RoadPoly,
  home: { x: number; z: number },
  count: number,
  spacing = 16,
): { x: number; z: number }[] {
  const pts = road.points;
  if (pts.length < 2) {
    return [];
  }
  const out: { x: number; z: number }[] = [];
  let acc = 0;
  let nextAt = 8;
  for (let i = 1; i < pts.length && out.length < count; i += 1) {
    const [x0, z0] = pts[i - 1];
    const [x1, z1] = pts[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    acc += len;
    while (acc >= nextAt && out.length < count) {
      const t = 1 - (acc - nextAt) / (len || 1);
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      if (Math.hypot(x - home.x, z - home.z) > 8) {
        out.push({ x, z });
      }
      nextAt += spacing;
    }
  }
  return out;
}
