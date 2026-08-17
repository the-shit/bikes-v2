/**
 * Ownership: canned shambler steering (not Asgard AI).
 * Talks via: rider poses, not a singleton player. No LLM.
 * Budget: keep this file under ~300 lines.
 */

export type ZombieKind = 'shambler' | 'sprinter' | 'bruiser';

export type Shambler = {
  id: number;
  kind: ZombieKind;
  x: number;
  z: number;
  y: number;
  yaw: number;
  hp: number;
  maxHp: number;
  aggro: boolean;
  dead: boolean;
  hitCd: number;
  vx: number;
  vz: number;
  flashT: number;
  squashT: number;
  soakedT: number;
};

export const KIND: Record<
  ZombieKind,
  { walk: number; hp: number; radius: number; touch: number }
> = {
  shambler: { walk: 1.35, hp: 2, radius: 0.55, touch: 1 },
  sprinter: { walk: 2.75, hp: 1, radius: 0.5, touch: 1 },
  bruiser: { walk: 0.88, hp: 4, radius: 0.72, touch: 2 },
};

export type RiderPose = { x: number; z: number };

export const SHAMBLER = {
  walk: 1.35,
  aggroR: 18,
  dropAggro: 26,
  hp: 2,
  radius: 0.55,
} as const;

export function createShambler(
  id: number,
  x: number,
  z: number,
  y = 0,
  kind: ZombieKind = 'shambler',
): Shambler {
  const spec = KIND[kind];
  return {
    id,
    kind,
    x,
    z,
    y,
    yaw: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    aggro: false,
    dead: false,
    hitCd: 0,
    vx: 0,
    vz: 0,
    flashT: 0,
    squashT: 0,
    soakedT: 0,
  };
}

export function nearestPose(
  origin: RiderPose,
  poses: readonly RiderPose[],
): { pose: RiderPose; dist: number } | null {
  let best: { pose: RiderPose; dist: number } | null = null;
  for (const pose of poses) {
    const dist = Math.hypot(pose.x - origin.x, pose.z - origin.z);
    if (!best || dist < best.dist) {
      best = { pose, dist };
    }
  }
  return best;
}

/** Deterministic shamble. `riders` is 0–N saddles — chase the nearest. */
export function stepZombieAi(
  agent: Shambler,
  dt: number,
  riders: readonly RiderPose[],
  frozen = false,
): Shambler {
  const hitCd = Math.max(0, agent.hitCd - dt);
  const flashT = Math.max(0, agent.flashT - dt);
  const squashT = Math.max(0, agent.squashT - dt);
  const soakedT = Math.max(0, agent.soakedT - dt);
  if (frozen || agent.dead) {
    return { ...agent, hitCd, flashT, squashT, soakedT };
  }
  let { x, z, vx, vz } = agent;
  x += vx * dt;
  z += vz * dt;
  const damp = Math.exp(-8 * dt);
  vx *= damp;
  vz *= damp;
  const near = nearestPose({ x, z }, riders);
  if (!near) {
    return { ...agent, x, z, vx, vz, aggro: false, hitCd, flashT, squashT, soakedT };
  }
  let aggro = agent.aggro;
  if (near.dist <= SHAMBLER.aggroR) {
    aggro = true;
  } else if (near.dist > SHAMBLER.dropAggro) {
    aggro = false;
  }
  const sliding = Math.hypot(vx, vz) > 0.5;
  if (!aggro || near.dist < 0.4 || sliding) {
    return { ...agent, x, z, vx, vz, aggro, hitCd, flashT, squashT, soakedT };
  }
  const dx = near.pose.x - x;
  const dz = near.pose.z - z;
  const yaw = Math.atan2(dx, dz);
  const wet = soakedT > 0 ? 0.45 : 1;
  const step = KIND[agent.kind].walk * wet * dt;
  return {
    ...agent,
    aggro,
    yaw,
    x: x + Math.sin(yaw) * step,
    z: z + Math.cos(yaw) * step,
    vx,
    vz,
    hitCd,
    flashT,
    squashT,
    soakedT,
  };
}

export type ZombieAi = Shambler;
