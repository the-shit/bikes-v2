/**
 * Ownership: timed melee swings from the saddle.
 * Talks via: events/state. Do not import zombies/ AI internals.
 * Budget: keep this file under ~300 lines.
 */

export type MeleePhase = 'idle' | 'windup' | 'active' | 'recover';

export type MeleeState = {
  phase: MeleePhase;
  t: number;
  cooldown: number;
  struck: boolean;
};

export const MELEE = {
  windup: 0.1,
  active: 0.14,
  recover: 0.24,
  range: 2.6,
  halfArc: Math.PI / 3,
  damage: 1,
} as const;

export function createMelee(): MeleeState {
  return { phase: 'idle', t: 0, cooldown: 0, struck: false };
}

export function trySwing(state: MeleeState, want: boolean): MeleeState {
  if (!want || state.phase !== 'idle') {
    return state;
  }
  return { phase: 'windup', t: 0, cooldown: 0, struck: false };
}

export function stepMelee(state: MeleeState, dt: number): MeleeState {
  if (state.phase === 'idle') {
    return state;
  }
  const t = state.t + dt;
  if (state.phase === 'windup' && t >= MELEE.windup) {
    return { phase: 'active', t: t - MELEE.windup, cooldown: 0, struck: false };
  }
  if (state.phase === 'active' && t >= MELEE.active) {
    return { phase: 'recover', t: t - MELEE.active, cooldown: 0, struck: true };
  }
  if (state.phase === 'recover' && t >= MELEE.recover) {
    return createMelee();
  }
  return { ...state, t };
}

export function isMeleeActive(state: MeleeState): boolean {
  return state.phase === 'active';
}

export type Pose2 = { x: number; z: number };

export function meleeHits(
  origin: Pose2 & { yaw: number },
  agents: ReadonlyArray<Pose2 & { id: number }>,
  range = MELEE.range,
  halfArc = MELEE.halfArc,
): number[] {
  const fx = Math.sin(origin.yaw);
  const fz = Math.cos(origin.yaw);
  const hits: number[] = [];
  for (const a of agents) {
    const dx = a.x - origin.x;
    const dz = a.z - origin.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || dist < 1e-4) {
      continue;
    }
    const along = (dx * fx + dz * fz) / dist;
    const ang = Math.acos(Math.max(-1, Math.min(1, along)));
    if (ang <= halfArc) {
      hits.push(a.id);
    }
  }
  return hits;
}
