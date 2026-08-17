/**
 * Ownership: session snapshot shape. Pure copy, no stepping.
 * Talks via: SessionSnapshot. Tests and HUD read this.
 * Budget: keep this file under ~300 lines.
 */

import type { WorldBike } from '../bike/mount';
import type { Shot } from '../combat/throwables';
import type { LootHouse } from '../world/loot';
import type { SkyState } from '../world/sky';
import type { WorldStory } from '../world/story';
import type { Shambler } from '../zombies/ai';
import type { HordeState } from '../zombies/hordes';
import type { Rider, RiderId } from './rider';

export type HitEvent = {
  riderId: RiderId;
  id: number;
  kind: 'melee' | 'ram' | 'throw';
  damage: number;
  killed: boolean;
};

export type AudioCue = { id: string };

export type RiderSnapshot = Omit<
  Rider,
  | 'prevMelee'
  | 'prevHop'
  | 'prevLock'
  | 'prevMount'
  | 'prevRepair'
  | 'prevAssistUp'
  | 'prevAssistDown'
  | 'prevFire'
  | 'prevUse'
  | 'toastT'
>;

export type SessionSnapshot = {
  riders: RiderSnapshot[];
  bikes: WorldBike[];
  zombies: Shambler[];
  hitstopT: number;
  story: WorldStory;
  sky: SkyState;
  houses: LootHouse[];
  shots: Shot[];
  horde: HordeState;
};

export function toSnapshot(
  riders: readonly Rider[],
  bikes: readonly WorldBike[],
  zombies: readonly Shambler[],
  hitstopT: number,
  story: WorldStory,
  extra: {
    sky: SkyState;
    houses: readonly LootHouse[];
    shots: readonly Shot[];
    horde: HordeState;
  },
): SessionSnapshot {
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
      hp: r.hp,
      maxHp: r.maxHp,
      hurtT: r.hurtT,
      bag: { ...r.bag },
      throwCool: r.throwCool,
    })),
    bikes: bikes.map((b) => ({
      ...b,
      pose: { ...b.pose },
      air: { ...b.air },
      battery: { ...b.battery },
      tires: { ...b.tires },
      upgrades: { equipped: [...b.upgrades.equipped] },
    })),
    zombies: zombies.map((z) => ({ ...z })),
    hitstopT,
    story,
    sky: { ...extra.sky },
    houses: extra.houses.map((h) => ({ ...h })),
    shots: extra.shots.map((s) => ({ ...s })),
    horde: { ...extra.horde },
  };
}
