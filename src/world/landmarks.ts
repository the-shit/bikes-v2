/**
 * Ownership: real Mesa landmark pins in the bake frame.
 * Talks via: LandmarkPin[]. Charge + view consume these; no OSM fetch here.
 * Budget: keep this file under ~300 lines.
 */

import { CIRCLE_K_PIN, type ChargePoint } from './charge';
import type { RoadPoly } from './geo';

export type LandmarkStyle = 'circlek' | 'costco' | 'springs';

export type LandmarkPin = {
  id: string;
  name: string;
  subtitle: string;
  style: LandmarkStyle;
  x: number;
  z: number;
  charge: boolean;
};

/** v1 landmarks.json — Costco sits inside the 900 m bake. */
export const COSTCO_PIN = Object.freeze({
  x: -240.2,
  z: -693.1,
  lat: 33.3888862,
  lon: -111.6693838,
});

export function mesaLandmarks(roads: readonly RoadPoly[] = []): LandmarkPin[] {
  const springs = springsPin(roads);
  const pins: LandmarkPin[] = [
    {
      id: 'circlek',
      name: 'Circle K',
      subtitle: 'BASELINE & SOSSAMAN',
      style: 'circlek',
      x: CIRCLE_K_PIN.x,
      z: CIRCLE_K_PIN.z,
      charge: true,
    },
    {
      id: 'costco',
      name: 'Costco',
      subtitle: 'EVIL WHOLESALE',
      style: 'costco',
      x: COSTCO_PIN.x,
      z: COSTCO_PIN.z,
      charge: true,
    },
  ];
  if (springs) {
    pins.push(springs);
  }
  return pins;
}

export function landmarkChargePoints(
  pins: readonly LandmarkPin[],
): ChargePoint[] {
  return pins
    .filter((p) => p.charge && p.style !== 'circlek')
    .map((p) => ({
      id: p.id,
      kind: 'landmark' as const,
      name: p.name,
      x: p.x,
      z: p.z,
      r: p.style === 'costco' ? 22 : 16,
    }));
}

function springsPin(roads: readonly RoadPoly[]): LandmarkPin | null {
  const road = roads.find((r) =>
    (r.name || '').toLowerCase().includes('superstition'),
  );
  if (!road || road.points.length < 2) {
    return null;
  }
  const mid = road.points[Math.floor(road.points.length / 2)];
  if (!mid) {
    return null;
  }
  return {
    id: 'springs',
    name: 'Superstition Springs Blvd',
    subtitle: 'THE BIG ROAD',
    style: 'springs',
    x: mid[0],
    z: mid[1],
    charge: true,
  };
}
