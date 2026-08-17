import { describe, expect, it } from 'vitest';
import { createBag } from '../src/bike/bag';
import { createUpgrades } from '../src/bike/upgrades';
import {
  launchThrow,
  readyThrow,
  spendAmmo,
  stepShots,
  throwHits,
} from '../src/combat/throwables';

describe('throwables', () => {
  it('prefers rocks, then balloons, slingshot only with a mount', () => {
    expect(readyThrow(createBag(), createUpgrades())).toBeNull();
    expect(readyThrow(createBag({ rocks: 1 }), createUpgrades())).toBe('rock');
    expect(readyThrow(createBag({ balloons: 1 }), createUpgrades())).toBe(
      'balloon',
    );
    expect(readyThrow(createBag({ bands: 1 }), createUpgrades())).toBeNull();
    expect(
      readyThrow(createBag({ bands: 1 }), createUpgrades(['mount'])),
    ).toBe('slingshot');
  });

  it('flies and bursts on the ground, hitting nearby shamblers', () => {
    const shot = launchThrow(1, 1, { x: 0, y: 1.2, z: 0, yaw: 0 }, 'rock', null);
    expect(shot.vz).toBeGreaterThan(0);
    let live = [shot];
    let burst = false;
    for (let i = 0; i < 180; i += 1) {
      const step = stepShots(live, 1 / 60, () => 0);
      live = step.shots;
      if (step.bursts.length) {
        burst = true;
        expect(throwHits(step.bursts[0], [{ id: 9, x: step.bursts[0].x, z: step.bursts[0].z }])).toEqual(
          [9],
        );
        break;
      }
    }
    expect(burst).toBe(true);
    expect(spendAmmo(createBag({ rocks: 2 }), 'rock')?.rocks).toBe(1);
  });
});
