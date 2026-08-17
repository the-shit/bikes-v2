/**
 * Ownership: cartoon nibble when a live zombie overlaps a rider.
 * Talks via: hp numbers. No gore — just "OW!" and a woosey beat.
 * Budget: keep this file under ~300 lines.
 */

import { armorReduce, type UpgradeState } from '../bike/upgrades';
import type { Rider } from '../core/rider';
import { withToast } from '../core/rider';
import type { Shambler } from './ai';
import { KIND } from './ai';

export const BITE = {
  pad: 0.45,
  cd: 1.05,
  woozy: 2.4,
} as const;

export function stepBites(
  riders: readonly Rider[],
  zombies: readonly Shambler[],
  upgradesFor: (rider: Rider) => UpgradeState,
): { riders: Rider[]; zombies: Shambler[] } {
  let nextR = riders.map((r) => ({ ...r }));
  const nextZ = zombies.map((z) => {
    if (z.dead || z.hitCd > 0) {
      return z;
    }
    const spec = KIND[z.kind];
    for (let i = 0; i < nextR.length; i += 1) {
      const r = nextR[i];
      const d = Math.hypot(z.x - r.bike.x, z.z - r.bike.z);
      if (d > spec.radius + BITE.pad) {
        continue;
      }
      const dmg = armorReduce(upgradesFor(r), spec.touch);
      let hp = Math.max(0, r.hp - dmg);
      let toast = dmg > 1 ? 'CHOMP!' : 'OW!';
      if (hp <= 0) {
        hp = 1;
        toast = 'WOOZY! Shake it off';
      }
      nextR[i] = withToast(
        { ...r, hp, hurtT: hp === 1 && r.hp <= dmg ? BITE.woozy : r.hurtT },
        toast,
        1.1,
      );
      return { ...z, hitCd: BITE.cd };
    }
    return z;
  });
  return { riders: nextR, zombies: nextZ };
}
