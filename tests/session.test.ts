import { describe, expect, it } from 'vitest';
import { createSession } from '../src/core/session';
import { idleIntent } from '../src/input/intents';
import { createTerrain } from '../src/world/terrain';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { SHAMBLER } from '../src/zombies/ai';

const DT = 1 / 60;

function makeSession(
  pins: { x: number; z: number }[] = [{ x: 0, z: 4 }],
  riders = [{ id: 1, x: 0, z: 0, yaw: 0 }],
) {
  return createSession({
    riders,
    terrain: createTerrain(),
    cameraFrame: { x: 0, z: 0, faceYaw: 0 },
    blockers: HOME_CAMERA_BLOCKERS_LOCAL,
    shamblerPins: pins,
  });
}

describe('session combat proof', () => {
  it('melee kills a shambler standing in front', () => {
    const session = makeSession([{ x: 0, z: 1.6 }]);
    let snap = session.snapshot();
    expect(snap.zombies[0].dead).toBe(false);
    for (let swing = 0; swing < 3 && !snap.zombies[0].dead; swing += 1) {
      session.tick(DT, { 1: { ...idleIntent(), melee: true } });
      for (let i = 0; i < 40; i += 1) {
        session.tick(DT, { 1: idleIntent() });
      }
      snap = session.snapshot();
    }
    expect(snap.zombies[0].dead).toBe(true);
    expect(snap.riders[0].kills).toBe(1);
  });

  it('ram at speed hits; crawl does not', () => {
    const crawl = makeSession([{ x: 0, z: 0.4 }]);
    for (let i = 0; i < 10; i += 1) {
      crawl.tick(DT, { 1: idleIntent() });
    }
    expect(crawl.snapshot().zombies[0].dead).toBe(false);

    const ram = makeSession([{ x: 0, z: 2 }], [
      { id: 1, x: 0, z: -2, yaw: 0 },
    ]);
    for (let i = 0; i < 180; i += 1) {
      ram.tick(DT, { 1: { ...idleIntent(), throttle: 1 } });
    }
    const snap = ram.snapshot();
    expect(snap.riders[0].bike.speed).toBeGreaterThan(8);
    expect(snap.zombies[0].dead || snap.zombies[0].hp < SHAMBLER.hp).toBe(
      true,
    );
  });

  it('two riders: shambler chases the nearer saddle', () => {
    const session = makeSession([{ x: 0, z: 0 }], [
      { id: 1, x: 0, z: -4, yaw: 0 },
      { id: 2, x: 30, z: 30, yaw: 0 },
    ]);
    expect(session.snapshot().riders).toHaveLength(2);
    let z = session.snapshot().zombies[0];
    for (let i = 0; i < 90; i += 1) {
      session.tick(DT, { 1: idleIntent(), 2: idleIntent() });
      z = session.snapshot().zombies[0];
    }
    expect(z.aggro).toBe(true);
    expect(z.z).toBeLessThan(0);
  });
});
