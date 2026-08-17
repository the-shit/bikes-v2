/**
 * Ownership: chase camera + spring-arm (spawn-camera spec).
 * Talks via: bike pose + local blocker boxes. Pure — no WebGL.
 * Budget: keep this file under ~300 lines.
 */

export type Vec3 = { x: number; y: number; z: number };

export type BikePose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
};

export type CameraState = {
  position: Vec3;
  lookAt: Vec3;
};

export type CameraFrame = { x: number; z: number; faceYaw: number };

export type BlockerBox = {
  min: Vec3;
  max: Vec3;
};

export const CAMERA_DEFAULTS = {
  distance: 9.5,
  height: 3.6,
  lookAhead: 6.5,
  lookHeight: 1.15,
  positionLerp: 6.5,
  lookLerp: 8,
  speedDistanceBoost: 0.08,
  maxDistanceBoost: 4,
} as const;

export function createCameraState(opts: Partial<Vec3> = {}): CameraState {
  return {
    position: {
      x: opts.x ?? 0,
      y: opts.y ?? CAMERA_DEFAULTS.height,
      z: opts.z ?? -CAMERA_DEFAULTS.distance,
    },
    lookAt: { x: 0, y: CAMERA_DEFAULTS.lookHeight, z: 0 },
  };
}

export function desiredCamera(
  bike: BikePose,
  cfg = CAMERA_DEFAULTS,
): CameraState {
  const fx = Math.sin(bike.yaw);
  const fz = Math.cos(bike.yaw);
  const boost = Math.min(
    cfg.maxDistanceBoost,
    Math.max(0, bike.speed) * cfg.speedDistanceBoost,
  );
  const dist = cfg.distance + boost;
  return {
    position: {
      x: bike.x - fx * dist,
      y: bike.y + cfg.height,
      z: bike.z - fz * dist,
    },
    lookAt: {
      x: bike.x + fx * cfg.lookAhead,
      y: bike.y + cfg.lookHeight,
      z: bike.z + fz * cfg.lookAhead,
    },
  };
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const k = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k,
  };
}

export function stepCamera(
  cam: CameraState,
  bike: BikePose,
  dt: number,
  cfg = CAMERA_DEFAULTS,
): CameraState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return {
      position: { ...cam.position },
      lookAt: { ...cam.lookAt },
    };
  }
  const desired = desiredCamera(bike, cfg);
  const posA = 1 - Math.exp(-cfg.positionLerp * dt);
  const lookA = 1 - Math.exp(-cfg.lookLerp * dt);
  return {
    position: lerpVec3(cam.position, desired.position, posA),
    lookAt: lerpVec3(cam.lookAt, desired.lookAt, lookA),
  };
}

export function segmentBoxHit(a: Vec3, b: Vec3, box: BlockerBox): number | null {
  let tMin = 0;
  let tMax = 1;
  for (const axis of ['x', 'y', 'z'] as const) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) {
      if (a[axis] < box.min[axis] || a[axis] > box.max[axis]) {
        return null;
      }
      continue;
    }
    let t0 = (box.min[axis] - a[axis]) / d;
    let t1 = (box.max[axis] - a[axis]) / d;
    if (t0 > t1) {
      [t0, t1] = [t1, t0];
    }
    tMin = Math.max(tMin, t0);
    tMax = Math.min(tMax, t1);
    if (tMin > tMax) {
      return null;
    }
  }
  return tMin;
}

export function clampCameraToBlockers(
  camPos: Vec3,
  bikePos: Vec3,
  frame: CameraFrame | null | undefined,
  boxes: readonly BlockerBox[] | undefined,
  skin = 0.6,
): Vec3 {
  if (!boxes?.length || !frame) {
    return camPos;
  }
  const yaw = frame.faceYaw;
  const toLocal = (p: Vec3): Vec3 => {
    const wx = p.x - frame.x;
    const wz = p.z - frame.z;
    return {
      x: wx * Math.cos(yaw) - wz * Math.sin(yaw),
      y: p.y,
      z: wx * Math.sin(yaw) + wz * Math.cos(yaw),
    };
  };
  const a = toLocal(bikePos);
  const b = toLocal(camPos);
  let tHit: number | null = null;
  for (const box of boxes) {
    const t = segmentBoxHit(a, b, box);
    if (t != null && (tHit == null || t < tHit)) {
      tHit = t;
    }
  }
  if (tHit == null) {
    return camPos;
  }
  const segLen = Math.hypot(
    camPos.x - bikePos.x,
    camPos.y - bikePos.y,
    camPos.z - bikePos.z,
  );
  const t = Math.max(0.12, tHit - (segLen > 1e-6 ? skin / segLen : 0));
  return {
    x: bikePos.x + (camPos.x - bikePos.x) * t,
    y: bikePos.y + (camPos.y - bikePos.y) * t,
    z: bikePos.z + (camPos.z - bikePos.z) * t,
  };
}
