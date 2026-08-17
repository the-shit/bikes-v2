/**
 * Ownership: rocks / water-balloons / slingshot from the saddle.
 * Talks via: Shot[] + bag ammo. Campy — balloons soak, no fire.
 * Budget: keep this file under ~300 lines.
 */

import type { Bag } from '../bike/bag';
import { takeFromBag } from '../bike/bag';
import { hasUpgrade, type UpgradeState } from '../bike/upgrades';

export type ThrowableId = 'rock' | 'balloon' | 'slingshot';

export type Shot = {
  id: number;
  kind: ThrowableId;
  riderId: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
};

export type ThrowHit = {
  riderId: number;
  ids: number[];
  kind: ThrowableId;
  x: number;
  z: number;
};

export const THROW = {
  cool: 0.55,
  gravity: 18,
  rock: { speed: 18, loft: 4.2, life: 1.35, r: 0.85, dmg: 1, ammo: 'rocks' },
  balloon: { speed: 13, loft: 5.4, life: 1.55, r: 3.2, dmg: 1, ammo: 'balloons' },
  slingshot: { speed: 28, loft: 2.4, life: 1.05, r: 0.6, dmg: 1, ammo: 'bands' },
} as const;

const AMMO: Record<ThrowableId, keyof Bag> = {
  rock: 'rocks',
  balloon: 'balloons',
  slingshot: 'bands',
};

export function readyThrow(bag: Bag, upgrades: UpgradeState): ThrowableId | null {
  if (bag.rocks > 0) {
    return 'rock';
  }
  if (bag.balloons > 0) {
    return 'balloon';
  }
  if (bag.bands > 0 && hasUpgrade(upgrades, 'mount')) {
    return 'slingshot';
  }
  return null;
}

export function launchThrow(
  id: number,
  riderId: number,
  from: { x: number; y: number; z: number; yaw: number },
  kind: ThrowableId,
  aim: { x: number; z: number } | null,
): Shot {
  const spec = THROW[kind];
  let yaw = from.yaw;
  if (aim) {
    yaw = Math.atan2(aim.x - from.x, aim.z - from.z);
  }
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  return {
    id,
    kind,
    riderId,
    x: from.x + fx * 0.8,
    y: from.y + 1.15,
    z: from.z + fz * 0.8,
    vx: fx * spec.speed,
    vy: spec.loft,
    vz: fz * spec.speed,
    life: spec.life,
  };
}

export function spendAmmo(bag: Bag, kind: ThrowableId): Bag | null {
  return takeFromBag(bag, { [AMMO[kind]]: 1 });
}

export function stepShots(
  shots: readonly Shot[],
  dt: number,
  groundY: (x: number, z: number) => number,
): { shots: Shot[]; bursts: Shot[] } {
  const live: Shot[] = [];
  const bursts: Shot[] = [];
  for (const s of shots) {
    const next: Shot = {
      ...s,
      vy: s.vy - THROW.gravity * dt,
      x: s.x + s.vx * dt,
      y: s.y + s.vy * dt,
      z: s.z + s.vz * dt,
      life: s.life - dt,
    };
    const gy = groundY(next.x, next.z);
    if (next.life <= 0 || next.y <= gy + 0.08) {
      bursts.push({ ...next, y: Math.max(next.y, gy + 0.08) });
      continue;
    }
    live.push(next);
  }
  return { shots: live, bursts };
}

export function throwHits(
  shot: Shot,
  agents: readonly { id: number; x: number; z: number; dead?: boolean }[],
): number[] {
  const r = THROW[shot.kind].r;
  const ids: number[] = [];
  for (const a of agents) {
    if (a.dead) {
      continue;
    }
    if (Math.hypot(a.x - shot.x, a.z - shot.z) <= r) {
      ids.push(a.id);
    }
  }
  return ids;
}

export function throwDamage(kind: ThrowableId): number {
  return THROW[kind].dmg;
}

export function throwToast(kind: ThrowableId, killed: boolean): string {
  if (kind === 'balloon') {
    return killed ? 'SOAKED!' : 'splorch';
  }
  if (kind === 'slingshot') {
    return killed ? 'PING!' : 'pew';
  }
  return killed ? 'BONK!' : 'clonk';
}
