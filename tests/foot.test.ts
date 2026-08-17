import { describe, expect, it } from 'vitest';
import { FOOT_DEFAULTS, stepFoot } from '../src/bike/foot';
import { BIKE_DEFAULTS, createBikeState, stepBike } from '../src/bike/physics';

const DT = 1 / 60;

describe('on-foot movement', () => {
  it('is slower than riding the same input', () => {
    let foot = createBikeState();
    let bike = createBikeState();
    for (let i = 0; i < 90; i += 1) {
      foot = stepFoot(foot, { throttle: 1, brake: 0, steer: 0 }, DT);
      bike = stepBike(bike, { throttle: 1, brake: 0, steer: 0 }, DT);
    }
    expect(foot.speed).toBeLessThanOrEqual(FOOT_DEFAULTS.maxSpeed);
    expect(bike.speed).toBeGreaterThan(foot.speed * 2);
    expect(FOOT_DEFAULTS.maxSpeed).toBeLessThan(BIKE_DEFAULTS.maxSpeed * 0.2);
  });

  it('turns in place when shuffling', () => {
    let foot = createBikeState();
    for (let i = 0; i < 30; i += 1) {
      foot = stepFoot(foot, { throttle: 0.2, brake: 0, steer: 1 }, DT);
    }
    expect(Math.abs(foot.yaw)).toBeGreaterThan(0.2);
    expect(foot.lean).toBe(0);
  });
});
