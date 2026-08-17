import { describe, expect, it } from 'vitest';
import { createHorde, HORDE, stepHorde } from '../src/zombies/hordes';
import { createShambler, stepZombieAi } from '../src/zombies/ai';
import { sampleSky, SKY, stepSky } from '../src/world/sky';

const DT = 1 / 60;

describe('hordes + sky', () => {
  it('does not wave pre-flip', () => {
    const step = stepHorde(createHorde(), 20, {
      flipped: false,
      nightAmt: 1,
      live: 0,
      pins: [{ x: 4, z: 4 }],
    });
    expect(step.spawns).toHaveLength(0);
  });

  it('spawns a mixed wave after the day gap', () => {
    let horde = createHorde();
    let spawns = stepHorde(horde, HORDE.dayGap + 0.05, {
      flipped: true,
      nightAmt: 0,
      live: 0,
      pins: [{ x: 10, z: 0 }],
    });
    expect(spawns.spawns.length).toBe(HORDE.bunch);
    expect(spawns.horde.wave).toBe(1);
    horde = spawns.horde;
    spawns = stepHorde(horde, HORDE.dayGap + 0.05, {
      flipped: true,
      nightAmt: 1,
      live: 2,
      pins: [{ x: 10, z: 0 }],
    });
    expect(spawns.spawns.some((s) => s.kind === 'sprinter' || s.kind === 'bruiser')).toBe(
      true,
    );
  });

  it('sprinters outrun shamblers; soak slows them', () => {
    let fast = createShambler(1, 0, 0, 0, 'sprinter');
    let slow = createShambler(2, 0, 0, 0, 'shambler');
    for (let i = 0; i < 45; i += 1) {
      fast = stepZombieAi(fast, DT, [{ x: 0, z: 10 }]);
      slow = stepZombieAi(slow, DT, [{ x: 0, z: 10 }]);
    }
    expect(fast.z).toBeGreaterThan(slow.z);
    let wet = { ...fast, soakedT: 2, z: 0 };
    let dry = { ...fast, soakedT: 0, z: 0 };
    for (let i = 0; i < 30; i += 1) {
      wet = stepZombieAi(wet, DT, [{ x: 0, z: 10 }]);
      dry = stepZombieAi(dry, DT, [{ x: 0, z: 10 }]);
    }
    expect(dry.z).toBeGreaterThan(wet.z);
  });

  it('post-flip sky cycles; pre-flip stays noon', () => {
    expect(stepSky(sampleSky(0), 1, false).nightAmt).toBe(0);
    const dusk = sampleSky(SKY.postStart);
    expect(dusk.nightAmt).toBeGreaterThan(0);
    const later = stepSky(dusk, 50, true);
    expect(later.t).toBeGreaterThan(dusk.t);
  });
});
