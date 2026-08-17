/**
 * Ownership: per-rider motion + chase cam. No world/zombie internals.
 * Talks via: Intent in, Rider out. Co-op: one of these per saddle.
 * Budget: keep this file under ~300 lines.
 */

import { createAirState, stepAir, type AirState } from '../bike/air';
import {
  createBikeState,
  stepBike,
  type BikeState,
} from '../bike/physics';
import { FEEDBACK, shakeOffset } from '../combat/feedback';
import {
  createLock,
  cycleLock,
  maintainLock,
  type LockState,
  type LockTarget,
} from '../combat/lock';
import { createMelee, stepMelee, trySwing, type MeleeState } from '../combat/melee';
import type { Intent } from '../input/intents';
import {
  clampCameraToBlockers,
  desiredCamera,
  stepCamera,
  type CameraFrame,
  type CameraState,
} from '../world/camera';
import type { Box3 } from '../world/home';

export type RiderId = number;

export type Rider = {
  id: RiderId;
  bike: BikeState;
  air: AirState;
  melee: MeleeState;
  camera: CameraState;
  toast: string;
  toastT: number;
  kills: number;
  impactFlashT: number;
  ramShakeT: number;
  ramLinesT: number;
  lock: LockState;
  prevMelee: boolean;
  prevHop: boolean;
  prevLock: boolean;
};

export type RiderSpawn = {
  id: RiderId;
  x: number;
  z: number;
  yaw: number;
  speed?: number;
};

export function createRider(
  spawn: RiderSpawn,
  heightAt: (x: number, z: number) => number,
  frame: CameraFrame,
  blockers: readonly Box3[],
): Rider {
  const bike = createBikeState({
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw,
    y: heightAt(spawn.x, spawn.z),
    speed: spawn.speed,
  });
  const desired = desiredCamera(bike);
  return {
    id: spawn.id,
    bike,
    air: createAirState(),
    melee: createMelee(),
    camera: {
      position: clampCameraToBlockers(
        desired.position,
        { x: bike.x, y: bike.y + 0.6, z: bike.z },
        frame,
        blockers,
      ),
      lookAt: desired.lookAt,
    },
    toast: '',
    toastT: 0,
    kills: 0,
    impactFlashT: 0,
    ramShakeT: 0,
    ramLinesT: 0,
    lock: createLock(),
    prevMelee: false,
    prevHop: false,
    prevLock: false,
  };
}

export function stepRiderMotion(
  rider: Rider,
  intent: Intent,
  dt: number,
  heightAt: (x: number, z: number) => number,
): Rider {
  const hopEdge = intent.hop && !rider.prevHop;
  const meleeEdge = intent.melee && !rider.prevMelee;
  const grade = rider.air.airborne ? undefined : { sampleHeight: heightAt };
  let bike = stepBike(
    rider.bike,
    {
      throttle: intent.throttle,
      brake: intent.brake,
      steer: intent.steer,
    },
    dt,
    grade,
  );
  const airStep = stepAir(
    rider.air,
    bike,
    heightAt(bike.x, bike.z),
    dt,
    hopEdge,
  );
  bike = { ...bike, y: airStep.y, speed: airStep.speed };
  return {
    ...rider,
    bike,
    air: airStep.air,
    melee: stepMelee(trySwing(rider.melee, meleeEdge), dt),
    prevHop: intent.hop,
    prevMelee: intent.melee,
    prevLock: intent.lock,
    toastT: Math.max(0, rider.toastT - dt),
    toast: rider.toastT - dt <= 0 ? '' : rider.toast,
    impactFlashT: Math.max(0, rider.impactFlashT - dt),
    ramShakeT: Math.max(0, rider.ramShakeT - dt),
    ramLinesT: Math.max(0, rider.ramLinesT - dt),
  };
}

export function holdRiderLock(
  rider: Rider,
  targets: readonly LockTarget[],
  dt: number,
): Rider {
  const held = maintainLock(rider.lock, rider.bike, targets, dt);
  let next = { ...rider, lock: held.lock };
  if (held.lost === 'range') {
    next = withToast(next, 'slipped away!', 0.9);
  }
  return next;
}

export function stepRiderLock(
  rider: Rider,
  intent: Intent,
  targets: readonly LockTarget[],
  dt: number,
): Rider {
  let next = rider;
  if (intent.lock && !rider.prevLock) {
    const lock = cycleLock(rider.lock, rider.bike, targets);
    if (lock.targetId != null) {
      next = withToast({ ...next, lock }, 'LOCKED!', 1.15);
    } else {
      next = { ...next, lock };
    }
  }
  return { ...holdRiderLock(next, targets, dt), prevLock: intent.lock };
}

export function decayRiderFx(rider: Rider, dt: number): Rider {
  return {
    ...rider,
    toastT: Math.max(0, rider.toastT - dt),
    toast: rider.toastT - dt <= 0 ? '' : rider.toast,
    impactFlashT: Math.max(0, rider.impactFlashT - dt),
    ramShakeT: Math.max(0, rider.ramShakeT - dt),
    ramLinesT: Math.max(0, rider.ramLinesT - dt),
  };
}

export function stepRiderCamera(
  rider: Rider,
  dt: number,
  frame: CameraFrame,
  blockers: readonly Box3[],
): Rider {
  const camera = stepCamera(rider.camera, rider.bike, dt);
  const clamped = clampCameraToBlockers(
    camera.position,
    { x: rider.bike.x, y: rider.bike.y + 0.6, z: rider.bike.z },
    frame,
    blockers,
  );
  const shake = shakeOffset(rider.ramShakeT, rider.id);
  return {
    ...rider,
    camera: {
      position: {
        x: clamped.x + shake.x,
        y: clamped.y + shake.y,
        z: clamped.z + shake.z,
      },
      lookAt: camera.lookAt,
    },
  };
}

export function withImpact(rider: Rider, kind: 'melee' | 'ram'): Rider {
  if (kind === 'ram') {
    return {
      ...rider,
      impactFlashT: FEEDBACK.impact,
      ramShakeT: FEEDBACK.ramShake,
      ramLinesT: FEEDBACK.ramLines,
    };
  }
  return { ...rider, impactFlashT: FEEDBACK.impact };
}

export function withToast(rider: Rider, msg: string, hold = 1.6): Rider {
  return { ...rider, toast: msg, toastT: hold };
}
