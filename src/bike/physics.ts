/**
 * Ownership: bike momentum, lean, traction, grade assist.
 * Talks via: events/state. Do not import combat/ or zombies/ internals.
 * Budget: keep this file under ~300 lines.
 */

import type { RideFeel } from './feel';

export type BikeState = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  lean: number;
};

export type BikeInput = {
  throttle: number;
  brake: number;
  steer: number;
};

export type GradeField = {
  sampleHeight: (x: number, z: number) => number;
  sampleM?: number;
  gravity?: number;
};

export const BIKE_DEFAULTS = {
  maxSpeed: 42,
  accel: 32,
  brake: 38,
  drag: 0.72,
  rollingResistance: 0.55,
  turnRate: 2.15,
  leanFactor: 0.42,
  leanReturn: 4.5,
  minSteerSpeed: 0.35,
  walkBackSpeed: 1.4,
  walkBackAccel: 2.2,
  /** track-stand lean while stopped (v1 #578 salvage) */
  standLean: 0.28,
  gradeGravity: 9.81,
  /** Exaggerate Mesa grades so they read at ride speed (salvage 521). */
  gradeScale: 8,
  gradeSampleM: 2.5,
} as const;

export function createBikeState(
  opts: Partial<Pick<BikeState, 'x' | 'y' | 'z' | 'yaw' | 'speed'>> = {},
): BikeState {
  return {
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    z: opts.z ?? 0,
    yaw: opts.yaw ?? 0,
    speed: opts.speed ?? 0,
    lean: 0,
  };
}

export function forwardFromYaw(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function stepBike(
  state: BikeState,
  input: BikeInput,
  dt: number,
  grade?: GradeField,
  feel?: RideFeel,
): BikeState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { ...state };
  }

  const cfg = BIKE_DEFAULTS;
  const maxSpeed = cfg.maxSpeed * (feel?.maxSpeedScale ?? 1);
  const accel = cfg.accel * (feel?.accelScale ?? 1);
  const brakeForce = cfg.brake * (feel?.brakeScale ?? 1);
  const drag = cfg.drag * (feel?.dragScale ?? 1);
  const rollingResistance = cfg.rollingResistance * (feel?.rollingScale ?? 1);
  const turnRate = cfg.turnRate * (feel?.turnScale ?? 1);
  const throttle = clamp01(input.throttle);
  const brake = clamp01(input.brake);
  const steer = clamp(input.steer, -1, 1);
  let speed = state.speed;

  if (throttle > 0 && speed < 0) {
    speed = 0;
  }
  speed += throttle * accel * dt;

  if (brake > 0 && speed > 0) {
    speed = Math.max(0, speed - brake * brakeForce * dt);
  }

  if (brake > 0 && throttle === 0 && state.speed <= 0 && speed <= 0) {
    speed = Math.max(-cfg.walkBackSpeed, speed - brake * cfg.walkBackAccel * dt);
  }

  if (brake === 0 && speed < 0) {
    speed = Math.min(0, speed + cfg.walkBackAccel * 3 * dt);
  }

  if (speed > 0) {
    const resist = drag * speed + rollingResistance;
    speed = Math.max(0, speed - resist * dt);
  }

  if (grade) {
    speed += gradeAccel(state, speed, grade) * dt;
  }

  if (speed > maxSpeed) {
    speed = maxSpeed + (speed - maxSpeed) * 0.15;
  }

  const absSpeed = Math.abs(speed);
  const rolling =
    absSpeed < cfg.minSteerSpeed
      ? 0
      : Math.min(1, (absSpeed - cfg.minSteerSpeed) / 8);
  const highSpeedFactor =
    1 - Math.min(0.35, Math.max(0, speed) / (maxSpeed * 2.2 || 1));
  const steerSign = speed < 0 ? -1 : 1;
  const yaw =
    state.yaw +
    steer * steerSign * turnRate * rolling * highSpeedFactor * dt;

  const targetLean =
    rolling > 0
      ? -steer * steerSign * rolling * cfg.leanFactor * Math.min(1, absSpeed / 12)
      : -steer * cfg.standLean;
  const lean =
    state.lean + (targetLean - state.lean) * Math.min(1, cfg.leanReturn * dt);

  const fwd = forwardFromYaw(yaw);
  return {
    x: state.x + fwd.x * speed * dt,
    y: state.y,
    z: state.z + fwd.z * speed * dt,
    yaw,
    speed,
    lean,
  };
}

function gradeAccel(
  state: BikeState,
  speed: number,
  grade: GradeField,
): number {
  const d = grade.sampleM ?? BIKE_DEFAULTS.gradeSampleM;
  const g = grade.gravity ?? BIKE_DEFAULTS.gradeGravity * BIKE_DEFAULTS.gradeScale;
  const fwd = forwardFromYaw(state.yaw);
  const yA = grade.sampleHeight(state.x + fwd.x * d, state.z + fwd.z * d);
  const yB = grade.sampleHeight(state.x - fwd.x * d, state.z - fwd.z * d);
  const slope = (yA - yB) / (2 * d);
  const along = speed < 0 ? -1 : 1;
  return -slope * g * along;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
