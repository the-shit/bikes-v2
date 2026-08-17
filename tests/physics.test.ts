import { describe, expect, it } from 'vitest';
import {
  BIKE_DEFAULTS,
  createBikeState,
  stepBike,
} from '../src/bike/physics';

describe('bike physics constants', () => {
  it('exposes a finite stub feel table for M1 to fill', () => {
    expect(Object.keys(BIKE_DEFAULTS).sort()).toEqual(
      ['accel', 'brake', 'maxSpeed', 'turnRate'].sort(),
    );
    for (const value of Object.values(BIKE_DEFAULTS)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('starts at rest and does not invent motion yet', () => {
    const bike = createBikeState();
    expect(bike).toEqual({ x: 0, y: 0, z: 0, yaw: 0, speed: 0 });
    expect(stepBike(bike, 1 / 60)).toEqual(bike);
  });
});
