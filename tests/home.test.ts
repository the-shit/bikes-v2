import { describe, expect, it } from 'vitest';
import {
  HOME_CAMERA_BLOCKERS_LOCAL,
  HOME_CARPORT_LOCAL,
  HOME_COLLIDER_R,
  homeBikeSpawn,
  homeColliderClearance,
  homePlacement,
  localToWorldXZ,
} from '../src/world/home';

describe('carport spawn', () => {
  it('locks the issue #21 pin', () => {
    expect(HOME_CARPORT_LOCAL.x).toBeCloseTo(-7.334, 1);
    expect(HOME_CARPORT_LOCAL.z).toBeCloseTo(1.579, 1);
  });

  it('places the house north of eastbound Jan', () => {
    const road = { x: 0, z: 25, yaw: Math.PI / 2 };
    const place = homePlacement(road, 20, 1);
    expect(place.z).toBeLessThan(road.z);
    const door = localToWorldXZ(0, 1, place.faceYaw);
    expect(door.z).toBeGreaterThan(0.9);
  });

  it('spawns under the carport, nose toward Jan', () => {
    const place = homePlacement({ x: 0, z: 25, yaw: Math.PI / 2 }, 20, 1);
    const bike = homeBikeSpawn(place);
    expect(Math.hypot(bike.x - 0, bike.z - 25)).toBeGreaterThan(12);
    expect(bike.yaw).toBeCloseTo(place.faceYaw, 5);
    const nose = localToWorldXZ(0, 1, bike.yaw);
    expect(nose.z).toBeGreaterThan(0.9);
  });

  it('stays outside the home collider and inside the carport roof', () => {
    expect(homeColliderClearance()).toBeGreaterThan(HOME_COLLIDER_R);
    const roof = HOME_CAMERA_BLOCKERS_LOCAL.find((b) => b.name === 'carport_roof');
    expect(roof).toBeTruthy();
    if (!roof) {
      return;
    }
    expect(HOME_CARPORT_LOCAL.x).toBeGreaterThan(roof.min.x);
    expect(HOME_CARPORT_LOCAL.x).toBeLessThan(roof.max.x);
    expect(HOME_CARPORT_LOCAL.z).toBeGreaterThan(roof.min.z);
    expect(HOME_CARPORT_LOCAL.z).toBeLessThan(roof.max.z);
  });
});
