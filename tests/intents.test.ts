import { describe, expect, it } from 'vitest';
import { clampAxis, idleIntent } from '../src/input/intents';

describe('intents', () => {
  it('starts idle (no keys implied)', () => {
    expect(idleIntent()).toEqual({
      throttle: 0,
      steer: 0,
      brake: 0,
      lookX: 0,
      lookY: 0,
      fire: false,
      melee: false,
      mount: false,
    });
  });

  it('clamps device axes', () => {
    expect(clampAxis(2)).toBe(1);
    expect(clampAxis(-4)).toBe(-1);
    expect(clampAxis(0.25)).toBe(0.25);
  });
});
