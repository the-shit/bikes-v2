import { describe, expect, it } from 'vitest';
import { createSession } from '../src/core/session';
import type { RiderSpawn } from '../src/core/rider';
import { idleIntent } from '../src/input/intents';
import { createTerrain } from '../src/world/terrain';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { SHAMBLER } from '../src/zombies/ai';

const DT = 1 / 60;

function makeSession(
  pins: { x: number; z: number }[] = [{ x: 0, z: 4 }],
  riders: RiderSpawn[] = [{ id: 1, x: 0, z: 0, yaw: 0 }],
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

  it('two riders cannot ram the same shambler in one tick', () => {
    const session = makeSession([{ x: 0, z: 0.2 }], [
      { id: 1, x: 0, z: 0, yaw: 0, speed: 20 },
      { id: 2, x: 0.05, z: 0, yaw: 0, speed: 20 },
    ]);
    const hits: { riderId: number; kind: string }[] = [];
    session.bus.on('combat.hit', (e) => {
      hits.push(e as { riderId: number; kind: string });
    });
    session.tick(DT, { 1: idleIntent(), 2: idleIntent() });
    const rams = hits.filter((h) => h.kind === 'ram');
    expect(rams).toHaveLength(1);
    const snap = session.snapshot();
    expect(snap.zombies[0].dead).toBe(true);
    expect(snap.riders.filter((r) => r.kills > 0)).toHaveLength(1);
  });

  it('freezes motion for a beat after a melee hit', () => {
    const session = makeSession([{ x: 0, z: 1.6 }]);
    let hit = false;
    session.bus.on('combat.hit', () => {
      hit = true;
    });
    for (let i = 0; i < 20 && !hit; i += 1) {
      session.tick(DT, { 1: { ...idleIntent(), melee: true } });
    }
    expect(hit).toBe(true);
    const afterHit = session.snapshot();
    expect(afterHit.hitstopT).toBeGreaterThan(0);
    expect(afterHit.zombies[0].flashT).toBeGreaterThan(0);
    const x0 = afterHit.riders[0].bike.x;
    const z0 = afterHit.riders[0].bike.z;
    session.tick(DT, { 1: { ...idleIntent(), throttle: 1 } });
    const frozen = session.snapshot();
    expect(frozen.riders[0].bike.x).toBeCloseTo(x0, 5);
    expect(frozen.riders[0].bike.z).toBeCloseTo(z0, 5);
  });

  it('knocks a shambler away after hitstop', () => {
    const session = makeSession([{ x: 0, z: 1.6 }]);
    let zAtHit = 0;
    for (let i = 0; i < 20; i += 1) {
      session.tick(DT, { 1: { ...idleIntent(), melee: true } });
      const snap = session.snapshot();
      if (snap.zombies[0].flashT > 0 && zAtHit === 0) {
        zAtHit = snap.zombies[0].z;
      }
    }
    expect(zAtHit).toBeGreaterThan(0);
    while (session.snapshot().hitstopT > 0) {
      session.tick(DT, { 1: idleIntent() });
    }
    session.tick(DT, { 1: idleIntent() });
    session.tick(DT, { 1: idleIntent() });
    expect(session.snapshot().zombies[0].z).toBeGreaterThan(zAtHit);
  });

  it('Q-cycles a lock and drops it when the shambler is bonked out', () => {
    const session = makeSession([
      { x: 0, z: 6 },
      { x: 2, z: 10 },
    ]);
    session.tick(DT, { 1: { ...idleIntent(), lock: true } });
    const first = session.snapshot().riders[0].lock.targetId;
    expect(first).not.toBeNull();
    session.tick(DT, { 1: idleIntent() });
    session.tick(DT, { 1: { ...idleIntent(), lock: true } });
    const second = session.snapshot().riders[0].lock.targetId;
    expect(second).not.toBe(first);
    const locked = makeSession([{ x: 0, z: 1.6 }]);
    locked.tick(DT, { 1: { ...idleIntent(), lock: true } });
    expect(locked.snapshot().riders[0].lock.targetId).not.toBeNull();
    for (let swing = 0; swing < 3; swing += 1) {
      locked.tick(DT, { 1: { ...idleIntent(), melee: true } });
      for (let i = 0; i < 40; i += 1) {
        locked.tick(DT, { 1: idleIntent() });
      }
    }
    expect(locked.snapshot().zombies[0].dead).toBe(true);
    expect(locked.snapshot().riders[0].lock.targetId).toBeNull();
  });
});
