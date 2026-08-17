/**
 * Ownership: bunny-hop + ballistic air (M1). Ramps stay a later slice.
 * Talks via: BikeState y/speed. Do not import world internals.
 * Budget: keep this file under ~300 lines.
 */

import type { BikeState } from './physics';

export type AirState = {
  airborne: boolean;
  vy: number;
  coolT: number;
};

export const AIR_DEFAULTS = {
  gravity: 22,
  bunnyHopVy: 5.8,
  bunnyHopMinSpeed: 2.2,
  bunnyHopCoolT: 0.5,
  bunnyHopSpeedKeep: 0.98,
} as const;

export function createAirState(): AirState {
  return { airborne: false, vy: 0, coolT: 0 };
}

export function stepAir(
  air: AirState,
  bike: BikeState,
  groundY: number,
  dt: number,
  hop: boolean,
): { air: AirState; y: number; speed: number } {
  const next: AirState = { ...air, coolT: Math.max(0, air.coolT - dt) };
  let speed = next.airborne ? Math.max(0, bike.speed) : bike.speed;
  let y = Number.isFinite(bike.y) ? bike.y : groundY;

  if (!next.airborne) {
    y = groundY;
    if (
      hop &&
      next.coolT <= 0 &&
      speed >= AIR_DEFAULTS.bunnyHopMinSpeed
    ) {
      const hopVy = AIR_DEFAULTS.bunnyHopVy + Math.min(2.5, speed * 0.06);
      speed *= AIR_DEFAULTS.bunnyHopSpeedKeep;
      next.airborne = true;
      next.vy = hopVy;
      next.coolT = AIR_DEFAULTS.bunnyHopCoolT;
      y = groundY + 0.28;
    }
    return { air: next, y, speed };
  }

  next.vy -= AIR_DEFAULTS.gravity * dt;
  y += next.vy * dt;
  if (y <= groundY) {
    y = groundY;
    const impact = Math.abs(next.vy);
    next.airborne = false;
    next.vy = 0;
    next.coolT = AIR_DEFAULTS.bunnyHopCoolT * 0.6;
    if (impact >= 14) {
      speed *= 0.45;
    } else if (impact >= 6) {
      speed *= 0.78;
    }
  }
  return { air: next, y, speed };
}
