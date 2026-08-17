import { describe, expect, it } from 'vitest';
import { applyDamage, createHealth, isDead } from '../src/combat/damage';
import { FEEDBACK, hitImpulse, shakeOffset } from '../src/combat/feedback';
import {
  createMelee,
  isMeleeActive,
  markStruck,
  meleeHits,
  MELEE,
  stepMelee,
  swingArc,
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

  it('telegraphs ready and sweeps the bat across the nose', () => {
    const idle = swingArc(createMelee());
    expect(idle.ready).toBe(true);
    expect(idle.swinging).toBe(false);
    let m = trySwing(createMelee(), true);
    expect(swingArc(m).ready).toBe(false);
    expect(swingArc(m).angle).toBeGreaterThan(1);
    const start = swingArc(m).angle;
    for (let i = 0; i < Math.ceil(MELEE.windup / DT) + 2; i += 1) {
      m = stepMelee(m, DT);
    }
    const mid = swingArc(m);
    expect(mid.swinging).toBe(true);
    expect(mid.angle).toBeLessThan(start);
  });
});

describe('hit feedback', () => {
  it('knocks the target away from the rider', () => {
    const impulse = hitImpulse({ x: 0, z: 0 }, { x: 0, z: 2 }, 'melee');
    expect(impulse.vz).toBeGreaterThan(impulse.vx);
    expect(impulse.flashT).toBe(FEEDBACK.flash);
    const ram = hitImpulse({ x: 0, z: 0 }, { x: 0, z: 2 }, 'ram');
    expect(ram.vz).toBeGreaterThan(impulse.vz);
  });

  it('shake dies when the timer is spent', () => {
    expect(shakeOffset(0, 1)).toEqual({ x: 0, y: 0, z: 0 });
    const live = shakeOffset(FEEDBACK.ramShake, 1);
    expect(Math.hypot(live.x, live.y, live.z)).toBeGreaterThan(0.05);
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
