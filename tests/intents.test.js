import { describe, expect, it } from 'vitest';
import { clampAxis, idleIntent } from '../src/input/intents.js';

describe('intents', () => {
  it('idleIntent is a zeroed snapshot', () => {
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

  it('clampAxis saturates to [-1, 1]', () => {
    expect(clampAxis(2)).toBe(1);
    expect(clampAxis(-4)).toBe(-1);
    expect(clampAxis(0.25)).toBe(0.25);
  });
});
