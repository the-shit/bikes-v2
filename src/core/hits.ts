/**
 * Ownership: apply a resolved hit to riders + zombies.
 * Talks via: HitEvent on the bus. Session owns who called hurt.
 * Budget: keep this file under ~300 lines.
 */

import { applyDamage, isDead } from '../combat/damage';
import { FEEDBACK, hitImpulse } from '../combat/feedback';
import { RAM } from '../combat/ram';
import type { Shambler } from '../zombies/ai';
import type { EventBus } from './events';
import { withImpact, withToast, type Rider, type RiderId } from './rider';
import type { HitEvent } from './snap';

const HIT_TOAST = {
  meleeKill: 'BONK!',
  ramKill: 'RAM!',
  melee: 'boing',
  ram: 'whoosh',
} as const;

export type HurtWorld = {
  riders: Rider[];
  zombies: Shambler[];
  hitstopT: number;
};

export function applyHurt(
  world: HurtWorld,
  bus: EventBus,
  riderId: RiderId,
  id: number,
  amount: number,
  kind: HitEvent['kind'],
): HurtWorld {
  let { riders, hitstopT } = world;
  const zombies = world.zombies.map((z) => {
    if (z.id !== id || z.dead) {
      return z;
    }
    const nextHp = applyDamage({ hp: z.hp, max: z.maxHp }, amount);
    const dead = isDead(nextHp);
    const toast =
      kind === 'ram'
        ? dead
          ? HIT_TOAST.ramKill
          : HIT_TOAST.ram
        : dead
          ? HIT_TOAST.meleeKill
          : HIT_TOAST.melee;
    riders = riders.map((r) => {
      if (r.id !== riderId) {
        return r;
      }
      const toasted = withImpact(withToast(r, toast), kind);
      return dead ? { ...toasted, kills: r.kills + 1 } : toasted;
    });
    bus.emit<HitEvent>('combat.hit', {
      riderId,
      id,
      kind,
      damage: amount,
      killed: dead,
    });
    hitstopT = FEEDBACK.hitstop;
    const rider = riders.find((r) => r.id === riderId);
    const impulse = hitImpulse(
      { x: rider?.bike.x ?? z.x, z: rider?.bike.z ?? z.z },
      { x: z.x, z: z.z },
      kind,
    );
    return {
      ...z,
      hp: nextHp.hp,
      dead,
      hitCd: kind === 'ram' ? RAM.cooldown : z.hitCd,
      vx: impulse.vx,
      vz: impulse.vz,
      flashT: impulse.flashT,
      squashT: impulse.squashT,
    };
  });
  return { riders, zombies, hitstopT };
}
