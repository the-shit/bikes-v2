import { describe, expect, it } from 'vitest';
import {
  createWorldBike,
  nearestMountable,
  occupyBike,
  parkBike,
} from '../src/bike/mount';
import { createBikeState } from '../src/bike/physics';

describe('world bikes', () => {
  it('parked bike stays put and can be remounted', () => {
    const bike = createWorldBike(1, { x: 3, z: 4, yaw: 1.2, speed: 12 }, 1);
    const parked = parkBike(bike, createBikeState({ x: 3, z: 4, yaw: 1.2, speed: 12 }));
    expect(parked.occupantId).toBeNull();
    expect(parked.pose.speed).toBe(0);
    expect(parked.pose.x).toBe(3);
    expect(nearestMountable(3.1, 4.1, [parked])?.id).toBe(1);
    expect(occupyBike(parked, 2).occupantId).toBe(2);
  });

  it('occupied bike is not mountable; far bike is out of reach', () => {
    const ridden = createWorldBike(1, { x: 0, z: 0 }, 1);
    const parked = createWorldBike(2, { x: 40, z: 0 }, null);
    expect(nearestMountable(0, 0, [ridden, parked])).toBeNull();
    expect(nearestMountable(0, 0, [parked])).toBeNull();
    expect(nearestMountable(40, 0.2, [parked])?.id).toBe(2);
  });
});
