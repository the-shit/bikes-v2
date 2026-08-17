import { describe, expect, it } from 'vitest';
import { createAirState } from '../src/bike/air';
import { createBikeState } from '../src/bike/physics';
import { findRampLaunch, makeRamp, tryRampLaunch } from '../src/world/jumps';

describe('curated ramps', () => {
  const ramp = makeRamp('kick', 0, 2, 0);

  it('launches when approaching the lip at speed', () => {
    const bike = createBikeState({ x: 0, z: 0, yaw: 0, speed: 14 });
    expect(findRampLaunch(bike, [ramp])?.id).toBe('kick');
    const hit = tryRampLaunch(createAirState(), bike, [ramp], 0);
    expect(hit).not.toBeNull();
    expect(hit?.air.airborne).toBe(true);
    expect(hit?.air.vy).toBeGreaterThan(3);
    expect(hit?.toast).toMatch(/RAMP/);
  });

  it('ignores a reverse approach and a crawl', () => {
    const back = createBikeState({ x: 0, z: 0, yaw: Math.PI, speed: 16 });
    expect(findRampLaunch(back, [ramp])).toBeNull();
    const crawl = createBikeState({ x: 0, z: 0, yaw: 0, speed: 3 });
    expect(tryRampLaunch(createAirState(), crawl, [ramp], 0)).toBeNull();
  });
});
