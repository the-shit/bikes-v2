import { describe, expect, it } from 'vitest';
import { applyDamage, createHealth, isDead } from '../src/combat/damage';
import {
  createMelee,
  isMeleeActive,
  markStruck,
  meleeHits,
  MELEE,
  stepMelee,
  trySwing,
} from '../src/combat/melee';
import { RAM, ramDamage, ramHits } from '../src/combat/ram';

const DT = 1 / 60;

describe('melee', () => {
  it('is timed: windup then active then recover', () => {
    let m = trySwing(createMelee(), true);
    expect(m.phase).toBe('windup');
    expect(isMeleeActive(m)).toBe(false);
    const frames = Math.ceil(MELEE.windup / DT) + 1;
    for (let i = 0; i < frames; i += 1) {
      m = stepMelee(m, DT);
    }
    expect(isMeleeActive(m)).toBe(true);
    for (let i = 0; i < 40; i += 1) {
      m = stepMelee(m, DT);
    }
    expect(m.phase).toBe('idle');
  });

  it('hits in front and misses behind', () => {
    const origin = { x: 0, z: 0, yaw: 0 };
    const front = meleeHits(origin, [{ id: 1, x: 0, z: 2 }]);
    const back = meleeHits(origin, [{ id: 2, x: 0, z: -2 }]);
    const far = meleeHits(origin, [{ id: 3, x: 0, z: MELEE.range + 1 }]);
    expect(front).toEqual([1]);
    expect(back).toEqual([]);
    expect(far).toEqual([]);
  });

  it('markStruck is a new state, not a field poke', () => {
    const idle = createMelee();
    const next = markStruck(idle);
    expect(idle.struck).toBe(false);
    expect(next.struck).toBe(true);
    expect(next).not.toBe(idle);
  });
});

describe('ram', () => {
  it('scales damage with speed and ignores crawls', () => {
    expect(ramDamage(3).damage).toBe(0);
    expect(ramDamage(RAM.minSpeed).damage).toBeCloseTo(RAM.base);
    expect(ramDamage(20).damage).toBeGreaterThan(ramDamage(10).damage);
  });

  it('contacts only nearby agents at speed', () => {
    const origin = { id: 0, x: 0, z: 0 };
    const near = { id: 1, x: 0.5, z: 0.5 };
    const far = { id: 2, x: 8, z: 0 };
    expect(ramHits(origin, 3, [near])).toEqual([]);
    expect(ramHits(origin, 12, [near, far])).toEqual([1]);
  });
});

describe('damage', () => {
  it('clamps at zero and reports death', () => {
    const h = applyDamage(createHealth(2), 5);
    expect(h.hp).toBe(0);
    expect(isDead(h)).toBe(true);
  });
});
