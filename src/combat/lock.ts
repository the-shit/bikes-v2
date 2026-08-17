/**
 * Ownership: lock-on acquire / cycle / release + steer nudge.
 * Talks via: poses. Helper, not autopilot. No camera. No LLM.
 * Budget: keep this file under ~300 lines.
 */

export const LOCK = {
  range: 28,
  cone: -0.12,
  assist: 0.14,
  assistCone: 0.4,
  minSpeed: 1.4,
  snapT: 0.42,
  flairT: 1.15,
} as const;

export type LockState = {
  targetId: number | null;
  snapT: number;
  flairT: number;
};

export type LockOrigin = { x: number; z: number; yaw: number; speed?: number };
export type LockTarget = { id: number; x: number; z: number; dead: boolean };

export function createLock(): LockState {
  return { targetId: null, snapT: 0, flairT: 0 };
}

export function wrapAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) {
    a -= Math.PI * 2;
  }
  while (a < -Math.PI) {
    a += Math.PI * 2;
  }
  return a;
}

export function lockCandidates(
  origin: LockOrigin,
  targets: readonly LockTarget[],
  range = LOCK.range,
): LockTarget[] {
  const fx = Math.sin(origin.yaw);
  const fz = Math.cos(origin.yaw);
  const hits: { t: LockTarget; dist: number }[] = [];
  for (const t of targets) {
    if (t.dead) {
      continue;
    }
    const dx = t.x - origin.x;
    const dz = t.z - origin.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || dist < 0.2) {
      continue;
    }
    const along = (dx * fx + dz * fz) / dist;
    if (along < LOCK.cone) {
      continue;
    }
    hits.push({ t, dist });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits.map((h) => h.t);
}

function acquire(id: number): LockState {
  return { targetId: id, snapT: LOCK.snapT, flairT: LOCK.flairT };
}

export function cycleLock(
  lock: LockState,
  origin: LockOrigin,
  targets: readonly LockTarget[],
): LockState {
  const list = lockCandidates(origin, targets);
  if (!list.length) {
    return { ...lock, targetId: null, snapT: 0 };
  }
  if (lock.targetId == null) {
    return acquire(list[0].id);
  }
  const i = list.findIndex((t) => t.id === lock.targetId);
  const next = list[(i < 0 ? 0 : i + 1) % list.length];
  if (next.id === lock.targetId) {
    return { ...lock, snapT: LOCK.snapT, flairT: Math.max(lock.flairT, 0.55) };
  }
  return acquire(next.id);
}

export function maintainLock(
  lock: LockState,
  origin: LockOrigin,
  targets: readonly LockTarget[],
  dt: number,
): { lock: LockState; lost: 'dead' | 'range' | null } {
  const snapT = Math.max(0, lock.snapT - dt);
  const flairT = Math.max(0, lock.flairT - dt);
  if (lock.targetId == null) {
    return { lock: { targetId: null, snapT, flairT }, lost: null };
  }
  const t = targets.find((z) => z.id === lock.targetId);
  if (!t || t.dead) {
    return { lock: { targetId: null, snapT: 0, flairT: 0 }, lost: 'dead' };
  }
  const dist = Math.hypot(t.x - origin.x, t.z - origin.z);
  if (dist > LOCK.range) {
    return { lock: { targetId: null, snapT: 0, flairT: 0 }, lost: 'range' };
  }
  return { lock: { targetId: lock.targetId, snapT, flairT }, lost: null };
}

/** Nudge steer toward the lock. Player input always wins a full stick. */
export function lockSteerAssist(
  origin: LockOrigin,
  target: { x: number; z: number } | null,
  playerSteer: number,
): number {
  const player = Math.max(-1, Math.min(1, playerSteer));
  if (!target) {
    return player;
  }
  const speed = Math.abs(origin.speed ?? 0);
  if (speed < LOCK.minSpeed) {
    return player;
  }
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const dist = Math.hypot(dx, dz) || 1;
  const along = (dx * Math.sin(origin.yaw) + dz * Math.cos(origin.yaw)) / dist;
  if (along < LOCK.assistCone) {
    return player;
  }
  const desired = Math.atan2(dx, dz);
  const err = wrapAngle(desired - origin.yaw);
  const fade = Math.min(1, (speed - LOCK.minSpeed) / 8);
  let nudge = Math.max(-1, Math.min(1, err / 0.9)) * LOCK.assist * fade;
  if (player * nudge < 0) {
    nudge *= 0.2;
  }
  const mixed = player + nudge * (1 - Math.abs(player) * 0.55);
  return Math.max(-1, Math.min(1, mixed));
}
