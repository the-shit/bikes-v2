/**
 * Ownership: sim tick — riders + world. No WebGL, no LLM.
 * Talks via: per-rider Intent map. World / rider / view stay separable.
 * Budget: keep this file under ~300 lines.
 */

import { applyDamage, isDead } from '../combat/damage';
import { isMeleeActive, markStruck, meleeHits, MELEE } from '../combat/melee';
import { RAM, ramDamage, ramHits } from '../combat/ram';
import { idleIntent, type Intent } from '../input/intents';
import type { CameraFrame } from '../world/camera';
import type { Box3 } from '../world/home';
import type { Terrain } from '../world/terrain';
import { stepZombieAi, type Shambler } from '../zombies/ai';
import { seedShamblers } from '../zombies/spawn';
import { createBus, type EventBus } from './events';
import {
  createRider,
  stepRiderCamera,
  stepRiderMotion,
  withToast,
  type Rider,
  type RiderId,
  type RiderSpawn,
} from './rider';

export type HitEvent = {
  riderId: RiderId;
  id: number;
  kind: 'melee' | 'ram';
  damage: number;
  killed: boolean;
};

export type RiderSnapshot = Omit<Rider, 'prevMelee' | 'prevHop' | 'toastT'>;

export type SessionSnapshot = {
  riders: RiderSnapshot[];
  zombies: Shambler[];
};

export type Session = {
  bus: EventBus;
  tick(dt: number, intents: Readonly<Record<RiderId, Intent>>): void;
  snapshot(): SessionSnapshot;
};

const HIT_TOAST = {
  meleeKill: 'BONK!',
  ramKill: 'RAM!',
  melee: 'boing',
  ram: 'whoosh',
} as const;

export function createSession(opts: {
  riders: RiderSpawn[];
  terrain: Terrain;
  cameraFrame: CameraFrame;
  blockers: readonly Box3[];
  shamblerPins: { x: number; z: number }[];
}): Session {
  const bus = createBus();
  const heightAt = (x: number, z: number) => opts.terrain.sampleHeight(x, z);
  let riders = opts.riders.map((spawn) =>
    createRider(spawn, heightAt, opts.cameraFrame, opts.blockers),
  );
  let zombies = seedShamblers(opts.shamblerPins, heightAt);

  function hurt(
    riderId: RiderId,
    id: number,
    amount: number,
    kind: HitEvent['kind'],
  ): void {
    zombies = zombies.map((z) => {
      if (z.id !== id || z.dead) {
        return z;
      }
      const nextHp = applyDamage({ hp: z.hp, max: z.maxHp }, amount);
      const dead = isDead(nextHp);
      riders = riders.map((r) => {
        if (r.id !== riderId) {
          return r;
        }
        const toasted = withToast(
          r,
          dead
            ? kind === 'ram'
              ? HIT_TOAST.ramKill
              : HIT_TOAST.meleeKill
            : kind === 'ram'
              ? HIT_TOAST.ram
              : HIT_TOAST.melee,
        );
        return dead ? { ...toasted, kills: r.kills + 1 } : toasted;
      });
      bus.emit<HitEvent>('combat.hit', {
        riderId,
        id,
        kind,
        damage: amount,
        killed: dead,
      });
      return {
        ...z,
        hp: nextHp.hp,
        dead,
        hitCd: kind === 'ram' ? RAM.cooldown : z.hitCd,
      };
    });
  }

  return {
    bus,
    tick(dt, intents) {
      riders = riders.map((rider) =>
        stepRiderMotion(
          rider,
          intents[rider.id] ?? idleIntent(),
          dt,
          heightAt,
        ),
      );

      for (const rider of riders) {
        if (isMeleeActive(rider.melee) && !rider.melee.struck) {
          riders = riders.map((r) =>
            r.id === rider.id ? { ...r, melee: markStruck(r.melee) } : r,
          );
          const meleeLive = zombies.filter((z) => !z.dead);
          for (const id of meleeHits(rider.bike, meleeLive)) {
            hurt(rider.id, id, MELEE.damage, 'melee');
          }
        }
        const ramLive = zombies.filter((z) => !z.dead && z.hitCd <= 0);
        const ramIds = ramHits(
          { id: rider.id, x: rider.bike.x, z: rider.bike.z },
          Math.abs(rider.bike.speed),
          ramLive,
        );
        const dmg = ramDamage(Math.abs(rider.bike.speed)).damage;
        for (const id of ramIds) {
          hurt(rider.id, id, dmg, 'ram');
        }
      }

      const poses = riders.map((r) => ({ x: r.bike.x, z: r.bike.z }));
      zombies = zombies.map((z) => {
        const next = stepZombieAi(z, dt, poses);
        return { ...next, y: heightAt(next.x, next.z) };
      });

      riders = riders.map((rider) =>
        stepRiderCamera(rider, dt, opts.cameraFrame, opts.blockers),
      );
    },
    snapshot() {
      return {
        riders: riders.map((r) => ({
          id: r.id,
          bike: { ...r.bike },
          air: { ...r.air },
          melee: { ...r.melee },
          camera: {
            position: { ...r.camera.position },
            lookAt: { ...r.camera.lookAt },
          },
          toast: r.toast,
          kills: r.kills,
        })),
        zombies: zombies.map((z) => ({ ...z })),
      };
    },
  };
}
