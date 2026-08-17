import { describe, expect, it } from 'vitest';
import { createSession } from '../src/core/session';
import type { RiderSpawn } from '../src/core/rider';
import { idleIntent } from '../src/input/intents';
import { garageChargePoint } from '../src/world/charge';
import { FLIP } from '../src/world/flip';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { createStory } from '../src/world/story';
import { createTerrain } from '../src/world/terrain';
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

describe('session bike systems', () => {
  it('dismount parks the bike; remount from beside it', () => {
    const session = makeSession();
    session.tick(DT, { 1: { ...idleIntent(), mount: true } });
    let snap = session.snapshot();
    expect(snap.riders[0].mountedBikeId).toBeNull();
    expect(snap.bikes[0].occupantId).toBeNull();
    expect(snap.bikes[0].pose.speed).toBe(0);

    session.tick(DT, { 1: idleIntent() });
    session.tick(DT, { 1: { ...idleIntent(), mount: true } });
    snap = session.snapshot();
    expect(snap.riders[0].mountedBikeId).toBe(1);
    expect(snap.bikes[0].occupantId).toBe(1);
  });

  it('on foot the bike stays in the world', () => {
    const session = makeSession();
    session.tick(DT, { 1: { ...idleIntent(), mount: true } });
    const parked = session.snapshot().bikes[0].pose;
    for (let i = 0; i < 90; i += 1) {
      session.tick(DT, { 1: { ...idleIntent(), throttle: 1 } });
    }
    const snap = session.snapshot();
    expect(snap.riders[0].mountedBikeId).toBeNull();
    expect(
      Math.hypot(snap.riders[0].bike.x - parked.x, snap.riders[0].bike.z - parked.z),
    ).toBeGreaterThan(1);
    expect(
      Math.hypot(snap.bikes[0].pose.x - parked.x, snap.bikes[0].pose.z - parked.z),
    ).toBeLessThan(0.2);
    expect(snap.riders[0].bike.speed).toBeLessThan(4);
  });

  it('second rider can yoink a parked bike', () => {
    const session = makeSession([{ x: 80, z: 80 }], [
      { id: 1, x: 0, z: 0, yaw: 0 },
      { id: 2, x: 0.4, z: 0, yaw: 0, withBike: false },
    ]);
    session.tick(DT, {
      1: { ...idleIntent(), mount: true },
      2: idleIntent(),
    });
    session.tick(DT, { 1: idleIntent(), 2: idleIntent() });
    session.tick(DT, {
      1: idleIntent(),
      2: { ...idleIntent(), mount: true },
    });
    const snap = session.snapshot();
    expect(snap.riders[0].mountedBikeId).toBeNull();
    expect(snap.riders[1].mountedBikeId).toBe(1);
    expect(snap.bikes.filter((b) => b.occupantId === 2)).toHaveLength(1);
  });

  it('throttle drains the pack; garage stay tops it', () => {
    const drain = makeSession();
    for (let i = 0; i < 240; i += 1) {
      drain.tick(DT, { 1: { ...idleIntent(), throttle: 1 } });
    }
    expect(drain.snapshot().bikes[0].battery.charge).toBeLessThan(0.96);

    const refill = createSession({
      riders: [{ id: 1, x: 0, z: 0, yaw: 0, charge: 0.2 }],
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [],
      chargePoints: [garageChargePoint({ x: 0, z: 0 })],
    });
    expect(refill.snapshot().bikes[0].battery.charge).toBeCloseTo(0.2);
    refill.tick(DT, { 1: idleIntent() });
    expect(refill.snapshot().bikes[0].battery.charge).toBe(1);
  });

  it('holds shamblers until the flip lands', () => {
    const session = createSession({
      riders: [{ id: 1, x: 0, z: 0, yaw: 0 }],
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [{ x: 4, z: 4 }],
      story: createStory({ tutorial: false }),
    });
    expect(session.snapshot().zombies).toHaveLength(0);
    expect(session.snapshot().story.flip.phase).toBe('pre');
    session.beginFlip();
    session.tick(DT, { 1: idleIntent() });
    expect(session.snapshot().story.flip.phase).toBe('turning');
    expect(session.snapshot().zombies).toHaveLength(0);
    const frames = Math.ceil(FLIP.turnDuration / DT) + 2;
    for (let i = 0; i < frames; i += 1) {
      session.tick(DT, { 1: idleIntent() });
    }
    const snap = session.snapshot();
    expect(snap.story.flip.phase).toBe('post');
    expect(snap.zombies).toHaveLength(1);
  });

  it('scavenges on foot and tosses a rock', () => {
    const session = createSession({
      riders: [{ id: 1, x: 0, z: 0, yaw: 0, withBike: false, bag: { rocks: 2 } }],
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [{ x: 0, z: 4 }],
      spots: [
        { id: 'loot-0', kind: 'loot', x: 0, z: 0, yaw: 0, label: 'Porch' },
      ],
    });
    session.tick(DT, { 1: { ...idleIntent(), use: true } });
    expect(session.snapshot().houses[0].looted).toBe(true);
    expect(session.snapshot().riders[0].bag.rocks).toBeGreaterThan(2);
    session.tick(DT, { 1: { ...idleIntent(), fire: true } });
    expect(session.snapshot().shots.length).toBeGreaterThan(0);
    expect(session.snapshot().riders[0].bag.rocks).toBeGreaterThan(0);
  });

  it('bolts a bigger pack at the garage', () => {
    const session = createSession({
      riders: [
        { id: 1, x: 0, z: 0, yaw: 0, bag: { cells: 3 } },
      ],
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [],
      chargePoints: [garageChargePoint({ x: 0, z: 0 })],
    });
    session.tick(DT, { 1: { ...idleIntent(), use: true } });
    const snap = session.snapshot();
    expect(snap.bikes[0].upgrades.equipped).toContain('battery');
    expect(snap.riders[0].bag.cells).toBe(0);
  });
});
