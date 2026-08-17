/**
 * Ownership: sim tick — riders + world. No WebGL, no LLM.
 * Talks via: per-rider Intent map. World / rider / view stay separable.
 */

import { createBattery } from '../bike/battery';
import { createWorldBike, type WorldBike } from '../bike/mount';
import type { Hazard } from '../bike/tires';
import { applyDamage, isDead } from '../combat/damage';
import { FEEDBACK, hitImpulse } from '../combat/feedback';
import { lockSteerAssist } from '../combat/lock';
import { isMeleeActive, markStruck, meleeHits, MELEE } from '../combat/melee';
import { RAM, ramDamage, ramHits } from '../combat/ram';
import { throwDamage } from '../combat/throwables';
import { idleIntent, type Intent } from '../input/intents';
import type { CameraFrame } from '../world/camera';
import type { ChargePoint } from '../world/charge';
import type { CuratedSpot } from '../world/curation';
import { beginFlip } from '../world/flip';
import type { Box3 } from '../world/home';
import type { Ramp } from '../world/jumps';
import {
  createStory,
  storySample,
  stepWorldStory,
  type WorldStory,
} from '../world/story';
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
import {
  toSnapshot,
  type AudioCue,
  type HitEvent,
  type SessionSnapshot,
} from './snap';
import { createSurvive, ramMul, stepSurvive } from './survive';

export type { AudioCue, HitEvent, RiderSnapshot, SessionSnapshot } from './snap';

export type Session = {
  bus: EventBus;
  tick(dt: number, intents: Readonly<Record<RiderId, Intent>>): void;
  snapshot(): SessionSnapshot;
  beginFlip(): void;
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
  ramps?: readonly Ramp[];
  story?: WorldStory;
  spots?: readonly CuratedSpot[];
}): Session {
  const bus = createBus();
  const heightAt = (x: number, z: number) => opts.terrain.sampleHeight(x, z);
  const hazards = opts.hazards ?? [];
  const chargePoints = opts.chargePoints ?? [];
  const ramps = opts.ramps ?? [];
  let story = opts.story ?? createStory({ flipped: true });
  let pendingFlip = false;
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
  let zombies =
    story.flip.phase === 'post'
      ? seedShamblers(opts.shamblerPins, heightAt)
      : [];
  let hitstopT = 0;
  const survive = createSurvive({
    spots: opts.spots,
    flipped: story.flip.phase === 'post',
  });
  survive.nextZombieId = 1 + zombies.reduce((m, z) => Math.max(m, z.id), 0);

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
        const toast =
          kind === 'ram'
            ? dead
              ? HIT_TOAST.ramKill
              : HIT_TOAST.ram
            : dead
              ? HIT_TOAST.meleeKill
              : HIT_TOAST.melee;
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
  }

  return {
    bus,
    beginFlip() {
      pendingFlip = true;
    },
    tick(dt, intents) {
      if (pendingFlip) {
        story = { ...story, flip: beginFlip(story.flip) };
        pendingFlip = false;
      }
      const steppedStory = stepWorldStory(
        story,
        dt,
        storySample(riders, intents, chargePoints, dt),
      );
      story = steppedStory.story;
      if (steppedStory.seedZombies && zombies.length === 0) {
        zombies = seedShamblers(opts.shamblerPins, heightAt);
        survive.nextZombieId = 1 + zombies.reduce((m, z) => Math.max(m, z.id), 0);
      }
      if (steppedStory.toast) {
        riders = riders.map((r) => withToast(r, steppedStory.toast as string));
      }
      for (const id of steppedStory.cues) {
        bus.emit<AudioCue>('audio.cue', { id });
      }

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
        ramps,
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
        const dmg =
          ramDamage(Math.abs(rider.bike.speed)).damage * ramMul(rider, bikes);
        for (const id of ramIds) {
          hurt(rider.id, id, dmg, 'ram');
        }
      }

      const poses = riders.map((r) => ({ x: r.bike.x, z: r.bike.z }));
      zombies = zombies.map((z) => {
        const next = stepZombieAi(z, dt, poses, false);
        return { ...next, y: heightAt(next.x, next.z) };
      });

      const lived = stepSurvive({ ...survive, riders, bikes, zombies }, dt, intents, {
        flipped: story.flip.phase === 'post',
        heightAt,
        chargePoints,
        pins: opts.shamblerPins,
      });
      Object.assign(survive, lived.world);
      riders = survive.riders;
      bikes = survive.bikes;
      zombies = survive.zombies;
      for (const th of lived.throws) {
        for (const id of th.ids) {
          hurt(th.riderId, id, throwDamage(th.kind), 'throw');
        }
      }

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
      const { sky, houses, shots, horde } = survive;
      return toSnapshot(riders, bikes, zombies, hitstopT, story, {
        sky,
        houses,
        shots,
        horde,
      });
    },
  };
}
