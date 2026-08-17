import { describe, expect, it } from 'vitest';
import { IDENTITY_FEEL, rideFeel } from '../src/bike/feel';

describe('rideFeel', () => {
  it('Trail + full pack + full tires is identity (M1 feel)', () => {
    const feel = rideFeel(1, 1, 2);
    for (const key of Object.keys(IDENTITY_FEEL) as (keyof typeof IDENTITY_FEEL)[]) {
      expect(feel[key]).toBeCloseTo(1, 8);
    }
  });

  it('dead battery is slower than Trail', () => {
    const dead = rideFeel(1, 0, 2);
    const live = rideFeel(1, 1, 2);
    expect(dead.accelScale).toBeLessThan(live.accelScale);
    expect(dead.maxSpeedScale).toBeLessThanOrEqual(live.maxSpeedScale);
  });

  it('flat tires crawl', () => {
    const flat = rideFeel(0, 1, 2);
    expect(flat.maxSpeedScale).toBeCloseTo(0.18, 5);
    expect(flat.dragScale).toBeGreaterThan(2);
  });
});
