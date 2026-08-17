/**
 * Ownership: 7620 E Jan placement + carport spawn + camera blockers.
 * Talks via: world poses. Salvage of v1 homeLayout / exact-carport-spawn.
 * Budget: keep this file under ~300 lines.
 */

export type HomePlace = {
  x: number;
  z: number;
  faceYaw: number;
};

export type Box3 = {
  name: string;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

/** Jordan's in-game pin (issue #21) — house-local. */
export const HOME_CARPORT_LOCAL = Object.freeze({ x: -7.35, z: 1.6 });

export const HOME_CAMERA_BLOCKERS_LOCAL: readonly Box3[] = Object.freeze([
  {
    name: 'body',
    min: { x: -6.2, y: 0, z: -5 },
    max: { x: 7.8, y: 2.9, z: 5 },
  },
  {
    name: 'carport_roof',
    min: { x: -9.3, y: 2.7, z: -3.3 },
    max: { x: -3.1, y: 2.8, z: 5.7 },
  },
]);

export const HOME_COLLIDER_R = 7.5;
export const HOME_SETBACK_M = 20;
export const HOME_SIDE_SIGN = 1;

export function localToWorldXZ(
  lx: number,
  lz: number,
  yaw: number,
): { x: number; z: number } {
  return {
    x: lx * Math.cos(yaw) + lz * Math.sin(yaw),
    z: -lx * Math.sin(yaw) + lz * Math.cos(yaw),
  };
}

export function homePlacement(
  spawn: { x: number; z: number; yaw?: number },
  setbackM = HOME_SETBACK_M,
  sideSign = HOME_SIDE_SIGN,
): HomePlace {
  const yaw = spawn.yaw ?? 0;
  const sign = sideSign < 0 ? -1 : 1;
  const sideX = Math.cos(yaw) * sign;
  const sideZ = -Math.sin(yaw) * sign;
  const x = spawn.x + sideX * setbackM;
  const z = spawn.z + sideZ * setbackM;
  const faceYaw = Math.atan2(spawn.x - x, spawn.z - z);
  return { x, z, faceYaw };
}

/**
 * World-space bike spawn under the carport.
 * Live v1 noses toward East Jan (faceYaw). Spec text also said +π — escalated.
 */
export function homeBikeSpawn(
  place: HomePlace,
  spawnLocal = HOME_CARPORT_LOCAL,
): { x: number; z: number; yaw: number } {
  const off = localToWorldXZ(spawnLocal.x, spawnLocal.z, place.faceYaw);
  return {
    x: place.x + off.x,
    z: place.z + off.z,
    yaw: place.faceYaw,
  };
}

export function homeColliderClearance(local = HOME_CARPORT_LOCAL): number {
  return Math.hypot(local.x - 0.8, local.z);
}
