/**
 * Ownership: curated ramp poses + launch test. Pure — no WebGL.
 * Talks via: Ramp[]. bike/air stays bunny-hop only; rideTick applies launches.
 * Budget: keep this file under ~300 lines.
 */

import type { AirState } from '../bike/air';
import { AIR_DEFAULTS } from '../bike/air';
import type { BikeState } from '../bike/physics';

export type Ramp = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  width: number;
  length: number;
  height: number;
};

export const RAMP = {
  minLaunchSpeed: 7.5,
  approachCos: 0.55,
  lipDist: 2.8,
  sideDist: 2.6,
  coolT: 0.85,
  width: 3.2,
  length: 4.2,
  height: 1.35,
} as const;

export function makeRamp(
  id: string,
  x: number,
  z: number,
  yaw: number,
  size: Partial<Pick<Ramp, 'width' | 'length' | 'height'>> = {},
): Ramp {
  return {
    id,
    x,
    z,
    yaw,
    width: size.width ?? RAMP.width,
    length: size.length ?? RAMP.length,
    height: size.height ?? RAMP.height,
  };
}

export function findRampLaunch(
  bike: Pick<BikeState, 'x' | 'z' | 'yaw' | 'speed'>,
  ramps: readonly Ramp[],
): Ramp | null {
  const fwdX = Math.sin(bike.yaw);
  const fwdZ = Math.cos(bike.yaw);
  let best: Ramp | null = null;
  let bestScore = -Infinity;
  for (const ramp of ramps) {
    const toX = ramp.x - bike.x;
    const toZ = ramp.z - bike.z;
    const dist = Math.hypot(toX, toZ);
    if (dist > RAMP.lipDist + ramp.length * 0.5) {
      continue;
    }
    const rFwdX = Math.sin(ramp.yaw);
    const rFwdZ = Math.cos(ramp.yaw);
    const align = fwdX * rFwdX + fwdZ * rFwdZ;
    if (align < RAMP.approachCos) {
      continue;
    }
    const along = toX * rFwdX + toZ * rFwdZ;
    if (along < -0.4 || along > RAMP.lipDist + 0.8) {
      continue;
    }
    const sideX = Math.cos(ramp.yaw);
    const sideZ = -Math.sin(ramp.yaw);
    const lateral = Math.abs(toX * sideX + toZ * sideZ);
    if (lateral > Math.max(RAMP.sideDist, ramp.width * 0.55)) {
      continue;
    }
    const score = align * 10 - dist + ramp.height;
    if (score > bestScore) {
      bestScore = score;
      best = ramp;
    }
  }
  return best;
}

export function tryRampLaunch(
  air: AirState,
  bike: BikeState,
  ramps: readonly Ramp[],
  groundY: number,
): { air: AirState; y: number; speed: number; toast: string } | null {
  if (air.airborne || air.coolT > 0 || bike.speed < RAMP.minLaunchSpeed) {
    return null;
  }
  const hit = findRampLaunch(bike, ramps);
  if (!hit) {
    return null;
  }
  const angle = Math.atan2(hit.height, Math.max(1.5, hit.length));
  const launchVy = Math.sin(angle) * bike.speed * 1.05 + 2.2;
  const speed = bike.speed * (0.92 + Math.min(0.08, bike.speed * 0.002));
  return {
    air: {
      airborne: true,
      vy: launchVy,
      coolT: RAMP.coolT,
    },
    y: groundY + 0.35,
    speed,
    toast: 'RAMP — boost!',
  };
}

export function rampGravity(): number {
  return AIR_DEFAULTS.gravity;
}
