import { describe, expect, it } from 'vitest';
import { createBikeState, stepBike } from '../src/bike/physics';
import {
  CAMERA_DEFAULTS,
  clampCameraToBlockers,
  createCameraState,
  desiredCamera,
  lerpVec3,
  segmentBoxHit,
  stepCamera,
} from '../src/world/camera';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';

describe('chase camera', () => {
  it('sits behind the bike and looks ahead', () => {
    const bike = createBikeState({ yaw: 0, speed: 10 });
    const { position, lookAt } = desiredCamera(bike);
    expect(position.z).toBeLessThan(bike.z);
    expect(position.y).toBeGreaterThan(bike.y);
    expect(lookAt.z).toBeGreaterThan(bike.z);
  });

  it('pulls back at speed', () => {
    const slow = desiredCamera(createBikeState({ speed: 2 }));
    const fast = desiredCamera(createBikeState({ speed: 30 }));
    const dist = (c: ReturnType<typeof desiredCamera>) =>
      Math.hypot(c.position.x, c.position.z);
    expect(dist(fast)).toBeGreaterThan(dist(slow));
  });

  it('follows after the bike moves', () => {
    let bike = createBikeState();
    let cam = createCameraState({
      x: 0,
      y: CAMERA_DEFAULTS.height,
      z: -CAMERA_DEFAULTS.distance,
    });
    for (let i = 0; i < 120; i += 1) {
      bike = stepBike(bike, { throttle: 1, brake: 0, steer: 0 }, 1 / 60);
      cam = stepCamera(cam, bike, 1 / 60);
    }
    const desired = desiredCamera(bike);
    expect(Math.abs(cam.position.x - desired.position.x)).toBeLessThan(8);
    expect(cam.lookAt.z).toBeGreaterThan(bike.z - 2);
  });

  it('lerpVec3 interpolates', () => {
    const r = lerpVec3({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 0.5);
    expect(r).toEqual({ x: 5, y: 10, z: 15 });
  });
});

describe('spring-arm', () => {
  const box = {
    min: { x: -1, y: 0, z: -1 },
    max: { x: 1, y: 2, z: 1 },
  };

  it('hits a box on the entry face', () => {
    const t = segmentBoxHit(
      { x: -3, y: 1, z: 0 },
      { x: 3, y: 1, z: 0 },
      box,
    );
    expect(t).toBeCloseTo(2 / 6, 6);
  });

  it('pulls the camera under the carport roof', () => {
    const frame = { x: 0, z: 0, faceYaw: 0 };
    const bike = { x: -7.6, y: 1.1, z: 3.4 };
    const cam = { x: -7.6, y: 4.7, z: -6.1 };
    const out = clampCameraToBlockers(
      cam,
      bike,
      frame,
      HOME_CAMERA_BLOCKERS_LOCAL,
    );
    expect(out.z).toBeGreaterThan(cam.z);
    expect(out.y).toBeLessThan(2.7);
    const arm = Math.hypot(out.x - bike.x, out.y - bike.y, out.z - bike.z);
    expect(arm).toBeGreaterThan(1);
  });
});
