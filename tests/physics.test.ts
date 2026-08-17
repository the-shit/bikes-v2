import { describe, expect, it } from 'vitest';
import {
  BIKE_DEFAULTS,
  createBikeState,
  stepBike,
} from '../src/bike/physics';

const DT = 1 / 60;
const idle = { throttle: 0, brake: 0, steer: 0 };

describe('bike physics', () => {
  it('exposes a finite feel table', () => {
    expect(BIKE_DEFAULTS.maxSpeed).toBeGreaterThan(10);
    expect(BIKE_DEFAULTS.accel).toBeGreaterThan(0);
    expect(BIKE_DEFAULTS.brake).toBeGreaterThan(0);
    expect(BIKE_DEFAULTS.turnRate).toBeGreaterThan(0);
    for (const value of Object.values(BIKE_DEFAULTS)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('starts at rest', () => {
    expect(createBikeState()).toMatchObject({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      speed: 0,
      lean: 0,
    });
  });

  it('accelerates under throttle along +Z', () => {
    let bike = createBikeState();
    for (let i = 0; i < 90; i += 1) {
      bike = stepBike(bike, { throttle: 1, brake: 0, steer: 0 }, DT);
    }
    expect(bike.speed).toBeGreaterThan(5);
    expect(bike.speed).toBeLessThanOrEqual(BIKE_DEFAULTS.maxSpeed * 1.2);
    expect(bike.z).toBeGreaterThan(1);
    expect(Math.abs(bike.x)).toBeLessThan(0.5);
  });

  it('braking reduces speed faster than coasting', () => {
    let coast = createBikeState({ speed: 20 });
    let brake = createBikeState({ speed: 20 });
    for (let i = 0; i < 45; i += 1) {
      coast = stepBike(coast, idle, DT);
      brake = stepBike(brake, { throttle: 0, brake: 1, steer: 0 }, DT);
    }
    expect(brake.speed).toBeLessThan(coast.speed);
    expect(brake.speed).toBeGreaterThanOrEqual(-BIKE_DEFAULTS.walkBackSpeed);
  });

  it('leans on steer while rolling and while stopped', () => {
    let rolling = createBikeState({ speed: 12 });
    for (let i = 0; i < 30; i += 1) {
      rolling = stepBike(rolling, { throttle: 0, brake: 0, steer: 1 }, DT);
    }
    expect(rolling.lean).not.toBeCloseTo(0, 2);
    expect(Math.abs(rolling.yaw)).toBeGreaterThan(0.05);

    let stand = createBikeState({ speed: 0 });
    for (let i = 0; i < 30; i += 1) {
      stand = stepBike(stand, { throttle: 0, brake: 0, steer: 1 }, DT);
    }
    expect(stand.lean).toBeLessThan(-0.05);
    expect(stand.yaw).toBeCloseTo(0, 5);
    expect(stand.speed).toBe(0);
  });

  it('gains speed downhill and loses it uphill', () => {
    const down = {
      sampleHeight: (x: number, z: number) => -z * 0.2,
    };
    const up = {
      sampleHeight: (x: number, z: number) => z * 0.2,
    };
    let a = createBikeState({ speed: 10, yaw: 0 });
    let b = createBikeState({ speed: 10, yaw: 0 });
    for (let i = 0; i < 60; i += 1) {
      a = stepBike(a, idle, DT, down);
      b = stepBike(b, idle, DT, up);
    }
    expect(a.speed).toBeGreaterThan(b.speed);
    expect(a.speed).toBeGreaterThan(10);
    expect(b.speed).toBeLessThan(10);
  });
});
