import { describe, expect, it } from 'vitest';
import { combineIntents } from '../src/input/combine';
import { idleIntent } from '../src/input/intents';

describe('combineIntents', () => {
  it('keeps the stronger analog axis and ORs buttons', () => {
    const keys = { ...idleIntent(), throttle: 1, steer: 0.2, melee: true };
    const pad = { ...idleIntent(), throttle: 0.4, steer: -0.9, hop: true };
    const out = combineIntents(keys, pad);
    expect(out.throttle).toBe(1);
    expect(out.steer).toBeCloseTo(-0.9);
    expect(out.melee).toBe(true);
    expect(out.hop).toBe(true);
  });

  it('idles when every device is quiet', () => {
    expect(combineIntents(idleIntent(), idleIntent())).toEqual(idleIntent());
  });
});
