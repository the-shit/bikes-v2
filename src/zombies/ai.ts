/**
 * Ownership: canned shambler steering (not Asgard AI).
 * Talks via: rider poses, not a singleton player. No LLM.
 * Budget: keep this file under ~300 lines.
 */

export type Shambler = {
  id: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  hp: number;
  maxHp: number;
  aggro: boolean;
  dead: boolean;
  hitCd: number;
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
): Shambler {
  return {
    id,
    x,
    z,
    y,
    yaw: 0,
    hp: SHAMBLER.hp,
    maxHp: SHAMBLER.hp,
    aggro: false,
    dead: false,
    hitCd: 0,
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
): Shambler {
  const hitCd = Math.max(0, agent.hitCd - dt);
  if (agent.dead) {
    return { ...agent, hitCd };
  }
  const near = nearestPose(agent, riders);
  if (!near) {
    return { ...agent, aggro: false, hitCd };
  }
  let aggro = agent.aggro;
  if (near.dist <= SHAMBLER.aggroR) {
    aggro = true;
  } else if (near.dist > SHAMBLER.dropAggro) {
    aggro = false;
  }
  if (!aggro || near.dist < 0.4) {
    return { ...agent, aggro, hitCd };
  }
  const dx = near.pose.x - agent.x;
  const dz = near.pose.z - agent.z;
  const yaw = Math.atan2(dx, dz);
  const step = SHAMBLER.walk * dt;
  return {
    ...agent,
    aggro,
    yaw,
    x: agent.x + Math.sin(yaw) * step,
    z: agent.z + Math.cos(yaw) * step,
    hitCd,
  };
}

export type ZombieAi = Shambler;
