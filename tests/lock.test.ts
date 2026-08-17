import { describe, expect, it } from 'vitest';
import {
  LOCK,
  createLock,
  cycleLock,
  lockCandidates,
  lockSteerAssist,
  maintainLock,
  wrapAngle,
} from '../src/combat/lock';

const origin = { x: 0, z: 0, yaw: 0, speed: 10 };
const pack = [
  { id: 1, x: 0, z: 8, dead: false },
  { id: 2, x: 2, z: 12, dead: false },
  { id: 3, x: 0, z: -10, dead: false },
];

describe('lock-on', () => {
  it('lists living targets in front, nearest first', () => {
    const ids = lockCandidates(origin, pack).map((t) => t.id);
    expect(ids[0]).toBe(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it('acquires nearest, then cycles', () => {
    const first = cycleLock(createLock(), origin, pack);
    expect(first.targetId).toBe(1);
    expect(first.snapT).toBe(LOCK.snapT);
    const second = cycleLock(first, origin, pack);
    expect(second.targetId).toBe(2);
    const third = cycleLock(second, origin, pack);
    expect(third.targetId).toBe(1);
  });

  it('releases when the target dies', () => {
    const locked = cycleLock(createLock(), origin, pack);
    const held = maintainLock(
      locked,
      origin,
      pack.map((t) => (t.id === 1 ? { ...t, dead: true } : t)),
      0,
    );
    expect(held.lock.targetId).toBeNull();
    expect(held.lost).toBe('dead');
  });

  it('releases when they wander out of range', () => {
    const locked = cycleLock(createLock(), origin, pack);
    const far = maintainLock(
      locked,
      origin,
      [{ id: 1, x: 0, z: LOCK.range + 5, dead: false }],
      0,
    );
    expect(far.lock.targetId).toBeNull();
    expect(far.lost).toBe('range');
  });

  it('nudges toward the lock but never overrides a full stick', () => {
    const target = { x: 3, z: 10 };
    const idle = lockSteerAssist(origin, target, 0);
    expect(idle).toBeGreaterThan(0);
    expect(Math.abs(idle)).toBeLessThanOrEqual(LOCK.assist + 1e-6);
    const fullLeft = lockSteerAssist(origin, target, 1);
    expect(fullLeft).toBeGreaterThan(0.85);
    expect(fullLeft).toBeLessThanOrEqual(1);
    const opposite = lockSteerAssist(origin, { x: -3, z: 10 }, 1);
    expect(opposite).toBeGreaterThan(0.7);
    expect(lockSteerAssist({ ...origin, speed: 0 }, target, 0)).toBe(0);
    expect(lockSteerAssist(origin, null, 0.4)).toBe(0.4);
    expect(lockSteerAssist(origin, { x: 10, z: 0 }, 0)).toBe(0);
  });

  it('wraps heading error onto [-pi, pi]', () => {
    expect(wrapAngle(Math.PI + 0.2)).toBeCloseTo(-Math.PI + 0.2, 5);
  });
});
