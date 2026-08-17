/**
 * Ownership: sim tick — riders + world. No WebGL, no LLM.
 * Talks via: per-rider Intent map. World / rider / view stay separable.
 * Budget: keep this file under ~300 lines.
 */

import { createBattery } from '../bike/battery';
import { createWorldBike, type WorldBike } from '../bike/mount';
import type { Hazard } from '../bike/tires';
import { applyDamage, isDead } from '../combat/damage';
import { FEEDBACK, hitImpulse } from '../combat/feedback';
import { lockSteerAssist } from '../combat/lock';
import { isMeleeActive, markStruck, meleeHits, MELEE } from '../combat/melee';
import { RAM, ramDamage, ramHits } from '../combat/ram';
import { idleIntent, type Intent } from '../input/intents';
import type { CameraFrame } from '../world/camera';
import type { ChargePoint } from '../world/charge';
import type { Box3 } from '../world/home';
import type { Terrain } from '../world/terrain';
import { stepZombieAi, type Shambler } from '../zombies/ai';
import { seedShamblers } from '../zombies/spawn';
import { createBus, type EventBus } from './events';
import { stepRideWorld } from './rideTick';
import {
  createRider,
  decayRiderFx,
  holdRiderLock,
  stepRiderCamera,
  stepRiderLock,
  withImpact,
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

export type RiderSnapshot = Omit<
  Rider,
  | 'prevMelee'
  | 'prevHop'
  | 'prevLock'
  | 'prevMount'
  | 'prevRepair'
  | 'prevAssistUp'
  | 'prevAssistDown'
  | 'toastT'
>;

export type SessionSnapshot = {
  riders: RiderSnapshot[];
  bikes: WorldBike[];
  zombies: Shambler[];
  hitstopT: number;
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
  hazards?: readonly Hazard[];
  chargePoints?: readonly ChargePoint[];
}): Session {
  const bus = createBus();
  const heightAt = (x: number, z: number) => opts.terrain.sampleHeight(x, z);
  const hazards = opts.hazards ?? [];
  const chargePoints = opts.chargePoints ?? [];
  let riders = opts.riders.map((spawn) =>
    createRider(spawn, heightAt, opts.cameraFrame, opts.blockers),
  );
  let bikes: WorldBike[] = opts.riders
    .filter((spawn) => spawn.withBike !== false)
    .map((spawn) => {
      const bike = createWorldBike(
        spawn.id,
        {
          x: spawn.x,
          z: spawn.z,
          yaw: spawn.yaw,
          y: heightAt(spawn.x, spawn.z),
          speed: spawn.speed,
        },
        spawn.id,
      );
      if (spawn.charge == null) {
        return bike;
      }
      return { ...bike, battery: createBattery({ charge: spawn.charge }) };
    });
  let zombies = seedShamblers(opts.shamblerPins, heightAt);
  let hitstopT = 0;

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
        const toasted = withImpact(
          withToast(
            r,
            dead
              ? kind === 'ram'
                ? HIT_TOAST.ramKill
                : HIT_TOAST.meleeKill
              : kind === 'ram'
                ? HIT_TOAST.ram
                : HIT_TOAST.melee,
          ),
          kind,
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
  }

  return {
    bus,
    tick(dt, intents) {
      riders = riders.map((rider) =>
        stepRiderLock(rider, intents[rider.id] ?? idleIntent(), zombies, dt),
      );

      if (hitstopT > 0) {
        hitstopT = Math.max(0, hitstopT - dt);
        riders = riders.map((rider) =>
          stepRiderCamera(decayRiderFx(rider, dt), dt, opts.cameraFrame, opts.blockers),
        );
        zombies = zombies.map((z) =>
          stepZombieAi(z, dt, riders.map((r) => ({ x: r.bike.x, z: r.bike.z })), true),
        );
        return;
      }

      const assisted: Record<RiderId, Intent> = {};
      for (const rider of riders) {
        const intent = intents[rider.id] ?? idleIntent();
        const locked = zombies.find((z) => z.id === rider.lock.targetId && !z.dead);
        assisted[rider.id] = {
          ...intent,
          steer: lockSteerAssist(rider.bike, locked ?? null, intent.steer),
        };
      }
      const stepped = stepRideWorld(
        { riders, bikes },
        dt,
        assisted,
        heightAt,
        hazards,
        chargePoints,
      );
      riders = stepped.riders;
      bikes = stepped.bikes;

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
        if (rider.mountedBikeId == null) {
          continue;
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
        const next = stepZombieAi(z, dt, poses, false);
        return { ...next, y: heightAt(next.x, next.z) };
      });

      riders = riders.map((rider) =>
        stepRiderCamera(
          holdRiderLock(rider, zombies, 0),
          dt,
          opts.cameraFrame,
          opts.blockers,
        ),
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
          impactFlashT: r.impactFlashT,
          ramShakeT: r.ramShakeT,
          ramLinesT: r.ramLinesT,
          lock: { ...r.lock },
          mountedBikeId: r.mountedBikeId,
          lastBikeId: r.lastBikeId,
        })),
        bikes: bikes.map((b) => ({
          ...b,
          pose: { ...b.pose },
          air: { ...b.air },
          battery: { ...b.battery },
          tires: { ...b.tires },
        })),
        zombies: zombies.map((z) => ({ ...z })),
        hitstopT,
      };
    },
  };
}
