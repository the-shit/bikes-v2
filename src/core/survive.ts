/**
 * Ownership: loot, shop, throws, bites, hordes, sky — one post-ride tick.
 * Talks via: SurviveWorld. Session applies throw hits through hurt().
 * Budget: keep this file under ~300 lines.
 */

import { bagCap } from '../bike/bag';
import {
  armorMaxHp,
  createUpgrades,
  hasUpgrade,
  nextUpgrade,
  ramScale,
  tryEquip,
  type UpgradeState,
} from '../bike/upgrades';
import type { WorldBike } from '../bike/mount';
import { bikeForRider, replaceBike } from '../bike/mount';
import {
  launchThrow,
  readyThrow,
  spendAmmo,
  stepShots,
  throwHits,
  THROW,
  type Shot,
  type ThrowHit,
} from '../combat/throwables';
import type { Intent } from '../input/intents';
import { idleIntent } from '../input/intents';
import { nearCharge, type ChargePoint } from '../world/charge';
import { housesFromSpots, nearLoot, scavenge, type LootHouse } from '../world/loot';
import { createSky, SKY, stepSky, type SkyState } from '../world/sky';
import type { CuratedSpot } from '../world/curation';
import { createHorde, stepHorde, type HordeState } from '../zombies/hordes';
import { stepBites } from '../zombies/contact';
import { spawnZombie } from '../zombies/spawn';
import type { Shambler } from '../zombies/ai';
import { withToast, type Rider, type RiderId } from './rider';

export type SurviveWorld = {
  riders: Rider[];
  bikes: WorldBike[];
  zombies: Shambler[];
  shots: Shot[];
  houses: LootHouse[];
  horde: HordeState;
  sky: SkyState;
  nextZombieId: number;
  nextShotId: number;
};

export function createSurvive(opts: {
  spots?: readonly CuratedSpot[];
  flipped?: boolean;
  pins?: { x: number; z: number }[];
}): SurviveWorld {
  return {
    riders: [],
    bikes: [],
    zombies: [],
    shots: [],
    houses: housesFromSpots(opts.spots ?? []),
    horde: createHorde(),
    sky: createSky(opts.flipped ? SKY.postStart : 0),
    nextZombieId: 100,
    nextShotId: 1,
  };
}

export function stepSurvive(
  world: SurviveWorld,
  dt: number,
  intents: Readonly<Record<RiderId, Intent>>,
  opts: {
    flipped: boolean;
    heightAt: (x: number, z: number) => number;
    chargePoints: readonly ChargePoint[];
    pins: readonly { x: number; z: number }[];
  },
): { world: SurviveWorld; throws: ThrowHit[] } {
  const sky = stepSky(world.sky, dt, opts.flipped);
  let riders = world.riders.map((r) => ({ ...r }));
  let bikes = world.bikes.map((b) => ({ ...b }));
  let houses = world.houses.map((h) => ({ ...h }));
  let shots = world.shots.map((s) => ({ ...s }));
  let nextShotId = world.nextShotId;

  for (let i = 0; i < riders.length; i += 1) {
    const intent = intents[riders[i].id] ?? idleIntent();
    const acted = applyUse(riders[i], intent, bikes, houses, opts.chargePoints);
    riders[i] = acted.rider;
    bikes = acted.bikes;
    houses = acted.houses;
    const fired = applyFire(riders[i], intent, bikes, world.zombies, nextShotId);
    riders[i] = {
      ...fired.rider,
      prevUse: intent.use,
      prevFire: intent.fire,
    };
    if (fired.shot) {
      shots.push(fired.shot);
      nextShotId = fired.shot.id + 1;
    }
  }

  const stepped = stepShots(shots, dt, opts.heightAt);
  const throws: ThrowHit[] = [];
  for (const burst of stepped.bursts) {
    const ids = throwHits(burst, world.zombies);
    if (ids.length) {
      throws.push({
        riderId: burst.riderId,
        ids,
        kind: burst.kind,
        x: burst.x,
        z: burst.z,
      });
    }
  }
  let soaked = world.zombies.slice();
  for (const th of throws) {
    if (th.kind === 'balloon') {
      soaked = soakIds(soaked, th.ids);
    }
  }

  const live = world.zombies.filter((z) => !z.dead);
  const wave = stepHorde(world.horde, dt, {
    flipped: opts.flipped,
    nightAmt: sky.nightAmt,
    live: live.length,
    pins: opts.pins,
  });
  let zombies = soaked.slice();
  let nextZombieId = world.nextZombieId;
  for (const s of wave.spawns) {
    zombies.push(spawnZombie(nextZombieId, s.x, s.z, opts.heightAt, s.kind));
    nextZombieId += 1;
  }

  const bitten = stepBites(riders, zombies, (r) => upgradesFor(r, bikes));
  return {
    world: {
      riders: bitten.riders,
      bikes,
      zombies: bitten.zombies,
      shots: stepped.shots,
      houses,
      horde: wave.horde,
      sky,
      nextZombieId,
      nextShotId,
    },
    throws,
  };
}

export function upgradesFor(
  rider: Rider,
  bikes: readonly WorldBike[],
): UpgradeState {
  const id = rider.mountedBikeId ?? rider.lastBikeId;
  const bike = bikes.find((b) => b.id === id);
  return bike?.upgrades ?? createUpgrades();
}

export function ramMul(rider: Rider, bikes: readonly WorldBike[]): number {
  return ramScale(upgradesFor(rider, bikes));
}

export function soakIds(
  zombies: readonly Shambler[],
  ids: readonly number[],
  seconds = 2.4,
): Shambler[] {
  if (!ids.length) {
    return zombies.slice();
  }
  const hit = new Set(ids);
  return zombies.map((z) =>
    hit.has(z.id) && !z.dead ? { ...z, soakedT: seconds } : z,
  );
}

function applyUse(
  rider: Rider,
  intent: Intent,
  bikes: WorldBike[],
  houses: LootHouse[],
  chargePoints: readonly ChargePoint[],
): { rider: Rider; bikes: WorldBike[]; houses: LootHouse[] } {
  if (!intent.use || rider.prevUse) {
    return { rider, bikes, houses };
  }
  const onFoot = rider.mountedBikeId == null;
  const house = nearLoot(rider.bike.x, rider.bike.z, houses);
  if (onFoot && house) {
    const rack = hasUpgrade(upgradesFor(rider, bikes), 'rack');
    const haul = scavenge(house, rider.bag, bagCap(rack));
    return {
      rider: withToast({ ...rider, bag: haul.bag }, haul.toast),
      bikes,
      houses: houses.map((h) => (h.id === haul.house.id ? haul.house : h)),
    };
  }
  const point = nearCharge(rider.bike.x, rider.bike.z, chargePoints);
  const bike =
    bikeForRider(bikes, rider.id) ??
    bikes.find((b) => b.id === rider.lastBikeId);
  if (point?.kind === 'garage' && bike) {
    const id = nextUpgrade(bike.upgrades, rider.bag);
    if (!id) {
      return {
        rider: withToast(rider, 'Need more porch parts'),
        bikes,
        houses,
      };
    }
    const fitted = tryEquip(bike.upgrades, rider.bag, id);
    if (!fitted) {
      return { rider, bikes, houses };
    }
    const maxHp = armorMaxHp(fitted.upgrades);
    return {
      rider: withToast(
        { ...rider, bag: fitted.bag, maxHp, hp: Math.min(maxHp, rider.hp + 1) },
        fitted.toast,
      ),
      bikes: replaceBike(bikes, { ...bike, upgrades: fitted.upgrades }),
      houses,
    };
  }
  return {
    rider: withToast(rider, onFoot ? 'Nothing to rummage' : 'Hop off to loot'),
    bikes,
    houses,
  };
}

function applyFire(
  rider: Rider,
  intent: Intent,
  bikes: WorldBike[],
  zombies: readonly Shambler[],
  shotId: number,
): { rider: Rider; shot: Shot | null } {
  if (!intent.fire || rider.prevFire || rider.throwCool > 0) {
    return { rider, shot: null };
  }
  const up = upgradesFor(rider, bikes);
  if (rider.bag.bands > 0 && !hasUpgrade(up, 'mount') && rider.bag.rocks <= 0 && rider.bag.balloons <= 0) {
    return { rider: withToast(rider, 'Need a weapon mount'), shot: null };
  }
  const kind = readyThrow(rider.bag, up);
  if (!kind) {
    return { rider: withToast(rider, 'Pockets empty'), shot: null };
  }
  const spent = spendAmmo(rider.bag, kind);
  if (!spent) {
    return { rider, shot: null };
  }
  const locked = zombies.find((z) => z.id === rider.lock.targetId && !z.dead);
  const shot = launchThrow(
    shotId,
    rider.id,
    {
      x: rider.bike.x,
      y: rider.bike.y,
      z: rider.bike.z,
      yaw: rider.bike.yaw,
    },
    kind,
    locked ? { x: locked.x, z: locked.z } : null,
  );
  return {
    rider: withToast(
      { ...rider, bag: spent, throwCool: THROW.cool },
      kind === 'balloon' ? 'Water balloon!' : kind === 'slingshot' ? 'Pew!' : 'Toss!',
      0.7,
    ),
    shot,
  };
}
