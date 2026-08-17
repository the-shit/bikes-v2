import { describe, expect, it } from 'vitest';
import { createUpgrades } from '../src/bike/upgrades';
import { createRider } from '../src/core/rider';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { createShambler } from '../src/zombies/ai';
import { BITE, stepBites } from '../src/zombies/contact';

const frame = { x: 0, z: 0, faceYaw: 0 };

function riderAt(hp: number) {
  const rider = createRider(
    { id: 1, x: 0, z: 0, yaw: 0 },
    () => 0,
    frame,
    HOME_CAMERA_BLOCKERS_LOCAL,
  );
  return { ...rider, hp, maxHp: hp };
}

describe('cartoon bites', () => {
  it('drops hp on overlap and snaps 0 hp to 1 with WOOZY', () => {
    const shambler = createShambler(1, 0, 0);
    const nibble = stepBites([riderAt(3)], [shambler], () => createUpgrades());
    expect(nibble.riders[0].hp).toBe(2);
    expect(nibble.riders[0].toast).toMatch(/OW/);
    expect(nibble.zombies[0].hitCd).toBe(BITE.cd);

    const last = stepBites([riderAt(1)], [shambler], () => createUpgrades());
    expect(last.riders[0].hp).toBe(1);
    expect(last.riders[0].toast).toMatch(/WOOZY/);
    expect(last.riders[0].hurtT).toBe(BITE.woozy);
  });
});
