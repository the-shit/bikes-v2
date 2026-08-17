/**
 * Ownership: M1 playable tick — intents in, poses out. No WebGL.
 * Talks via: Intent + events. Composition root for bike/combat/zombies.
 * Budget: keep this file under ~300 lines.
 */

import { createAirState, stepAir, type AirState } from '../bike/air';
import {
  createBikeState,
  stepBike,
  type BikeState,
} from '../bike/physics';
import { applyDamage, isDead } from '../combat/damage';
import {
  createMelee,
  isMeleeActive,
  meleeHits,
  MELEE,
  stepMelee,
  trySwing,
  type MeleeState,
} from '../combat/melee';
import { RAM, ramDamage, ramHits } from '../combat/ram';
import type { Intent } from '../input/intents';
import {
  clampCameraToBlockers,
  desiredCamera,
  stepCamera,
  type CameraFrame,
  type CameraState,
} from '../world/camera';
import type { Box3 } from '../world/home';
import type { Terrain } from '../world/terrain';
import { stepZombieAi, type Shambler } from '../zombies/ai';
import { seedShamblers } from '../zombies/spawn';
import { createBus, type EventBus } from './events';

export type HitEvent = {
  id: number;
  kind: 'melee' | 'ram';
  damage: number;
  killed: boolean;
};

export type SessionSnapshot = {
  bike: BikeState;
  air: AirState;
  melee: MeleeState;
  zombies: Shambler[];
  camera: CameraState;
  toast: string;
  kills: number;
};

export type Session = {
  bus: EventBus;
  tick(dt: number, intent: Intent): void;
  snapshot(): SessionSnapshot;
};

export function createSession(opts: {
  spawn: { x: number; z: number; yaw: number };
  terrain: Terrain;
  cameraFrame: CameraFrame;
  blockers: readonly Box3[];
  shamblerPins: { x: number; z: number }[];
}): Session {
  const bus = createBus();
  const heightAt = (x: number, z: number) => opts.terrain.sampleHeight(x, z);
  let bike = createBikeState({
    x: opts.spawn.x,
    z: opts.spawn.z,
    yaw: opts.spawn.yaw,
    y: heightAt(opts.spawn.x, opts.spawn.z),
  });
  let air = createAirState();
  let melee = createMelee();
  let zombies = seedShamblers(opts.shamblerPins, heightAt);
  let toast = '';
  let toastT = 0;
  let kills = 0;
  let prevMelee = false;
  let prevHop = false;

  const desired = desiredCamera(bike);
  let camera: CameraState = {
    position: clampCameraToBlockers(
      desired.position,
      { x: bike.x, y: bike.y + 0.6, z: bike.z },
      opts.cameraFrame,
      opts.blockers,
    ),
    lookAt: desired.lookAt,
  };

  function setToast(msg: string, hold = 1.6) {
    toast = msg;
    toastT = hold;
  }

  function hurt(id: number, amount: number, kind: HitEvent['kind']) {
    zombies = zombies.map((z) => {
      if (z.id !== id || z.dead) {
        return z;
      }
      const nextHp = applyDamage({ hp: z.hp, max: z.maxHp }, amount);
      const dead = isDead(nextHp);
      if (dead) {
        kills += 1;
        setToast(kind === 'ram' ? 'RAM!' : 'BONK!');
      } else {
        setToast(kind === 'ram' ? 'clip' : 'whiff-hit');
      }
      bus.emit<HitEvent>('combat.hit', {
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
    tick(dt, intent) {
      const hopEdge = intent.hop && !prevHop;
      const meleeEdge = intent.melee && !prevMelee;
      prevHop = intent.hop;
      prevMelee = intent.melee;

      const grade = air.airborne
        ? undefined
        : { sampleHeight: heightAt };
      bike = stepBike(
        bike,
        {
          throttle: intent.throttle,
          brake: intent.brake,
          steer: intent.steer,
        },
        dt,
        grade,
      );
      const groundY = heightAt(bike.x, bike.z);
      const airStep = stepAir(air, bike, groundY, dt, hopEdge);
      air = airStep.air;
      bike = { ...bike, y: airStep.y, speed: airStep.speed };

      melee = stepMelee(trySwing(melee, meleeEdge), dt);
      const live = zombies.filter((z) => !z.dead);
      if (isMeleeActive(melee) && !melee.struck) {
        const ids = meleeHits(bike, live);
        melee = { ...melee, struck: true };
        for (const id of ids) {
          hurt(id, MELEE.damage, 'melee');
        }
      }
      const ramIds = ramHits(
        { id: 0, x: bike.x, z: bike.z },
        Math.abs(bike.speed),
        live.filter((z) => z.hitCd <= 0),
      );
      const dmg = ramDamage(Math.abs(bike.speed)).damage;
      for (const id of ramIds) {
        hurt(id, dmg, 'ram');
      }

      zombies = zombies.map((z) => {
        const next = stepZombieAi(z, dt, bike);
        return { ...next, y: heightAt(next.x, next.z) };
      });

      camera = stepCamera(camera, bike, dt);
      camera = {
        ...camera,
        position: clampCameraToBlockers(
          camera.position,
          { x: bike.x, y: bike.y + 0.6, z: bike.z },
          opts.cameraFrame,
          opts.blockers,
        ),
      };

      toastT = Math.max(0, toastT - dt);
      if (toastT <= 0) {
        toast = '';
      }
    },
    snapshot() {
      return {
        bike,
        air,
        melee,
        zombies: zombies.map((z) => ({ ...z })),
        camera: {
          position: { ...camera.position },
          lookAt: { ...camera.lookAt },
        },
        toast,
        kills,
      };
    },
  };
}
