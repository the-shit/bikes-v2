/**
 * Ownership: one shambler type — shamble + aggro radius.
 * Talks via: events/state. Do not import bike/ physics internals.
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

export function stepZombieAi(
  agent: Shambler,
  dt: number,
  target: { x: number; z: number },
): Shambler {
  if (agent.dead) {
    return { ...agent, hitCd: Math.max(0, agent.hitCd - dt) };
  }
  const dx = target.x - agent.x;
  const dz = target.z - agent.z;
  const dist = Math.hypot(dx, dz);
  let aggro = agent.aggro;
  if (dist <= SHAMBLER.aggroR) {
    aggro = true;
  } else if (dist > SHAMBLER.dropAggro) {
    aggro = false;
  }
  if (!aggro || dist < 0.4) {
    return { ...agent, aggro, hitCd: Math.max(0, agent.hitCd - dt) };
  }
  const yaw = Math.atan2(dx, dz);
  const step = SHAMBLER.walk * dt;
  return {
    ...agent,
    aggro,
    yaw,
    x: agent.x + Math.sin(yaw) * step,
    z: agent.z + Math.cos(yaw) * step,
    hitCd: Math.max(0, agent.hitCd - dt),
  };
}

export type ZombieAi = Shambler;
