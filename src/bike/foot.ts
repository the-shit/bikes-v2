/**
 * Ownership: on-foot locomotion. Deliberately worse than the e-bike.
 * Talks via: BikeState pose (same shape, different feel table).
 * Budget: keep this file under ~300 lines.
 */

import {
  createBikeState,
  forwardFromYaw,
  type BikeInput,
  type BikeState,
} from './physics';

export const FOOT_DEFAULTS = {
  maxSpeed: 3.2,
  accel: 9,
  brake: 16,
  turnRate: 3.4,
  drag: 4.2,
  reverse: 0.55,
} as const;

export function createFootState(
  opts: Partial<Pick<BikeState, 'x' | 'y' | 'z' | 'yaw' | 'speed'>> = {},
): BikeState {
  return createBikeState(opts);
}

/** Jog / shuffle. No hop, no lean, no 150 km/h. */
export function stepFoot(
  state: BikeState,
  input: BikeInput,
  dt: number,
  heightAt?: (x: number, z: number) => number,
): BikeState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { ...state, lean: 0 };
  }
  const cfg = FOOT_DEFAULTS;
  const throttle = clamp01(input.throttle);
  const brake = clamp01(input.brake);
  const steer = clamp(input.steer, -1, 1);
  let speed = state.speed;

  if (throttle > 0 && speed < 0) {
    speed = 0;
  }
  speed += throttle * cfg.accel * dt;

  if (brake > 0 && speed > 0) {
    speed = Math.max(0, speed - brake * cfg.brake * dt);
  }
  if (brake > 0 && throttle === 0 && speed <= 0) {
    speed = Math.max(-cfg.maxSpeed * cfg.reverse, speed - brake * cfg.accel * dt);
  }
  if (brake === 0 && speed < 0) {
    speed = Math.min(0, speed + cfg.accel * 2 * dt);
  }

  const resist = cfg.drag * Math.abs(speed);
  if (speed > 0) {
    speed = Math.max(0, speed - resist * dt);
  } else if (speed < 0) {
    speed = Math.min(0, speed + resist * dt);
  }

  if (speed > cfg.maxSpeed) {
    speed = cfg.maxSpeed;
  }
  if (speed < -cfg.maxSpeed * cfg.reverse) {
    speed = -cfg.maxSpeed * cfg.reverse;
  }

  const turning = Math.abs(speed) > 0.08 || throttle > 0 || brake > 0;
  const yaw = turning
    ? state.yaw + steer * (speed < 0 ? -1 : 1) * cfg.turnRate * dt
    : state.yaw;
  const fwd = forwardFromYaw(yaw);
  const x = state.x + fwd.x * speed * dt;
  const z = state.z + fwd.z * speed * dt;
  return {
    x,
    y: heightAt ? heightAt(x, z) : state.y,
    z,
    yaw,
    speed,
    lean: 0,
  };
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
