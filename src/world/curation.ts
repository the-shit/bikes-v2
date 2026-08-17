/**
 * Ownership: hand-placed play spaces on the OSM backbone.
 * Talks via: curated markers (jumps, loot, charge, chokes). Not raw OSM.
 * Budget: keep this file under ~300 lines.
 */

import { CIRCLE_K_PIN } from './charge';
import type { RoadPoly } from './geo';
import { janStreetPoints } from './jan';
import { makeRamp, type Ramp } from './jumps';
import { COSTCO_PIN, type LandmarkPin } from './landmarks';

export type SpotKind = 'jump' | 'loot' | 'charge' | 'choke';

export type CuratedSpot = {
  id: string;
  kind: SpotKind;
  x: number;
  z: number;
  yaw: number;
  label: string;
};

export function curatedSpots(opts: {
  home: { x: number; z: number; faceYaw: number };
  jan: RoadPoly | null;
  landmarks?: readonly LandmarkPin[];
}): CuratedSpot[] {
  const { home, jan } = opts;
  const along = jan ? janStreetPoints(jan, home, 8, 28) : [];
  const yaw = janYaw(jan, home);
  const driveway: CuratedSpot = {
    id: 'jump-driveway',
    kind: 'jump',
    x: home.x + Math.sin(home.faceYaw) * 14,
    z: home.z + Math.cos(home.faceYaw) * 14,
    yaw: home.faceYaw,
    label: 'Driveway kicker',
  };
  const jumps = along.slice(0, 3).map((p, i) => ({
    id: `jump-jan-${i}`,
    kind: 'jump' as const,
    x: p.x,
    z: p.z,
    yaw,
    label: i === 0 ? 'Jan kicker' : `Jan line ${i + 1}`,
  }));
  const chokes: CuratedSpot[] = [
    {
      id: 'choke-jan',
      kind: 'choke',
      x: along[3]?.x ?? home.x + 40,
      z: along[3]?.z ?? home.z + 4,
      yaw,
      label: 'Jan pinch',
    },
    {
      id: 'choke-ck',
      kind: 'choke',
      x: CIRCLE_K_PIN.x,
      z: CIRCLE_K_PIN.z - 28,
      yaw: 0,
      label: 'CK lot mouth',
    },
    {
      id: 'choke-costco',
      kind: 'choke',
      x: COSTCO_PIN.x + 18,
      z: COSTCO_PIN.z + 40,
      yaw: Math.PI,
      label: 'Wholesale pinch',
    },
  ];
  const loot: CuratedSpot[] = along.slice(4, 7).map((p, i) => ({
    id: `loot-${i}`,
    kind: 'loot' as const,
    x: p.x + (i % 2 === 0 ? 12 : -12),
    z: p.z + 6,
    yaw,
    label: i === 0 ? 'Porch stash' : `Loot house ${i + 1}`,
  }));
  const charge: CuratedSpot[] = [
    {
      id: 'charge-ck',
      kind: 'charge',
      x: CIRCLE_K_PIN.x,
      z: CIRCLE_K_PIN.z,
      yaw: 0,
      label: 'Circle K',
    },
    {
      id: 'charge-costco',
      kind: 'charge',
      x: COSTCO_PIN.x,
      z: COSTCO_PIN.z,
      yaw: 0,
      label: 'Costco',
    },
  ];
  for (const lm of opts.landmarks ?? []) {
    if (lm.id === 'circlek' || lm.id === 'costco' || !lm.charge) {
      continue;
    }
    charge.push({
      id: `charge-${lm.id}`,
      kind: 'charge',
      x: lm.x,
      z: lm.z,
      yaw: 0,
      label: lm.name,
    });
  }
  return [driveway, ...jumps, ...chokes, ...loot, ...charge];
}

export function rampsFromSpots(spots: readonly CuratedSpot[]): Ramp[] {
  return spots
    .filter((s) => s.kind === 'jump')
    .map((s) =>
      makeRamp(s.id, s.x, s.z, s.yaw, s.id === 'jump-driveway'
        ? { width: 2.8, length: 3.4, height: 1.05 }
        : {}),
    );
}

export function flipSpawnPins(
  spots: readonly CuratedSpot[],
  home: { x: number; z: number },
): { x: number; z: number }[] {
  const pins: { x: number; z: number }[] = [];
  for (const s of spots) {
    if (s.kind !== 'choke' && s.kind !== 'loot' && s.id !== 'charge-ck') {
      continue;
    }
    if (Math.hypot(s.x - home.x, s.z - home.z) < 22) {
      continue;
    }
    pins.push({ x: s.x, z: s.z });
    if (s.kind === 'choke') {
      pins.push({
        x: s.x + Math.sin(s.yaw + 0.4) * 6,
        z: s.z + Math.cos(s.yaw + 0.4) * 6,
      });
    }
  }
  return pins.slice(0, 12);
}

function janYaw(road: RoadPoly | null, home: { x: number; z: number }): number {
  if (!road || road.points.length < 2) {
    return 0;
  }
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < road.points.length; i += 1) {
    const [x, z] = road.points[i];
    const d = Math.hypot(x - home.x, z - home.z);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  const a = road.points[Math.max(0, bestI - 1)];
  const b = road.points[Math.min(road.points.length - 1, bestI + 1)];
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}
