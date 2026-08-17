/**
 * Ownership: world bikes + mount/dismount. Bike persists when you hop off.
 * Talks via: WorldBike state. Co-op: one occupant, steal the parked ones.
 * Budget: keep this file under ~300 lines.
 */

import { createAirState, type AirState } from './air';
import { createBattery, type BatteryState } from './battery';
import { createBikeState, type BikeState } from './physics';
import { createTires, type TireState } from './tires';

export const MOUNT_DEFAULTS = {
  radius: 2.4,
} as const;

export type WorldBike = {
  id: number;
  pose: BikeState;
  air: AirState;
  battery: BatteryState;
  tires: TireState;
  occupantId: number | null;
};

export function createWorldBike(
  id: number,
  pose: Partial<Pick<BikeState, 'x' | 'y' | 'z' | 'yaw' | 'speed'>> = {},
  occupantId: number | null = null,
): WorldBike {
  return {
    id,
    pose: createBikeState(pose),
    air: createAirState(),
    battery: createBattery(),
    tires: createTires(),
    occupantId,
  };
}

export function parkBike(bike: WorldBike, pose: BikeState): WorldBike {
  return {
    ...bike,
    pose: { ...pose, speed: 0, lean: pose.lean },
    air: createAirState(),
    occupantId: null,
  };
}

export function occupyBike(bike: WorldBike, riderId: number): WorldBike {
  return { ...bike, occupantId: riderId };
}

export function nearestMountable(
  x: number,
  z: number,
  bikes: readonly WorldBike[],
  radius = MOUNT_DEFAULTS.radius,
): WorldBike | null {
  let best: WorldBike | null = null;
  let bestD: number = radius;
  for (const bike of bikes) {
    if (bike.occupantId != null) {
      continue;
    }
    const d = Math.hypot(bike.pose.x - x, bike.pose.z - z);
    if (d <= bestD) {
      best = bike;
      bestD = d;
    }
  }
  return best;
}

export function replaceBike(
  bikes: readonly WorldBike[],
  next: WorldBike,
): WorldBike[] {
  return bikes.map((b) => (b.id === next.id ? next : b));
}

export function bikeForRider(
  bikes: readonly WorldBike[],
  riderId: number,
): WorldBike | undefined {
  return bikes.find((b) => b.occupantId === riderId);
}
