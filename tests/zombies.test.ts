import { describe, expect, it } from 'vitest';
import { createShambler, SHAMBLER, stepZombieAi } from '../src/zombies/ai';
import { seedShamblers } from '../src/zombies/spawn';

const DT = 1 / 60;

describe('shambler AI', () => {
  it('idles outside aggro and chases inside', () => {
    const far = stepZombieAi(createShambler(1, 0, 0), DT, [
      { x: 0, z: SHAMBLER.aggroR + 5 },
    ]);
    expect(far.aggro).toBe(false);
    expect(far.z).toBe(0);

    let z = createShambler(1, 0, 0);
    for (let i = 0; i < 60; i += 1) {
      z = stepZombieAi(z, DT, [{ x: 0, z: 8 }]);
    }
    expect(z.aggro).toBe(true);
    expect(z.z).toBeGreaterThan(0.5);
  });

  it('stops when dead', () => {
    const dead = stepZombieAi(
      { ...createShambler(1, 0, 0), dead: true },
      DT,
      [{ x: 0, z: 2 }],
    );
    expect(dead.z).toBe(0);
  });

  it('seeds one type from pins', () => {
    const pack = seedShamblers(
      [
        { x: 1, z: 2 },
        { x: 3, z: 4 },
      ],
      () => 1.5,
    );
    expect(pack).toHaveLength(2);
    expect(pack[0].hp).toBe(SHAMBLER.hp);
    expect(pack[0].y).toBe(1.5);
    expect(pack[0].id).not.toBe(pack[1].id);
  });

  it('chases the nearer of two riders', () => {
    let z = createShambler(1, 0, 0);
    for (let i = 0; i < 60; i += 1) {
      z = stepZombieAi(z, DT, [
        { x: 20, z: 0 },
        { x: 0, z: 6 },
      ]);
    }
    expect(z.z).toBeGreaterThan(0.4);
    expect(Math.abs(z.x)).toBeLessThan(0.2);
  });
});
