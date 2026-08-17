import { describe, expect, it } from 'vitest';
import { createSession } from '../src/core/session';
import { idleIntent } from '../src/input/intents';
import { createTerrain } from '../src/world/terrain';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { SHAMBLER } from '../src/zombies/ai';

const DT = 1 / 60;

function makeSession(
  pins: { x: number; z: number }[] = [{ x: 0, z: 4 }],
) {
  return createSession({
    spawn: { x: 0, z: 0, yaw: 0 },
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
      session.tick(DT, { ...idleIntent(), melee: true });
      for (let i = 0; i < 40; i += 1) {
        session.tick(DT, idleIntent());
      }
      snap = session.snapshot();
    }
    expect(snap.zombies[0].dead).toBe(true);
    expect(snap.kills).toBe(1);
  });

  it('ram at speed kills; crawl does not', () => {
    const crawl = makeSession([{ x: 0, z: 0.4 }]);
    for (let i = 0; i < 10; i += 1) {
      crawl.tick(DT, idleIntent());
    }
    expect(crawl.snapshot().zombies[0].dead).toBe(false);

    const ram = createSession({
      spawn: { x: 0, z: -2, yaw: 0 },
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [{ x: 0, z: 2 }],
    });
    for (let i = 0; i < 180; i += 1) {
      ram.tick(DT, { ...idleIntent(), throttle: 1 });
    }
    const snap = ram.snapshot();
    expect(snap.bike.speed).toBeGreaterThan(8);
    expect(snap.zombies[0].dead || snap.zombies[0].hp < SHAMBLER.hp).toBe(
      true,
    );
  });
});
