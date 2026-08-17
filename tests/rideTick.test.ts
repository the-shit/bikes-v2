import { describe, expect, it } from 'vitest';
import { createBattery } from '../src/bike/battery';
import { createWorldBike } from '../src/bike/mount';
import { createTires } from '../src/bike/tires';
import { createRider } from '../src/core/rider';
import { stepRideWorld } from '../src/core/rideTick';
import { idleIntent } from '../src/input/intents';
import { circleKChargePoint } from '../src/world/charge';

const DT = 1 / 60;
const heightAt = () => 0;
const frame = { x: 0, z: 0, faceYaw: 0 };

function seeded(charge = 1, pressure = 1) {
  const rider = createRider({ id: 1, x: 0, z: 0, yaw: 0 }, heightAt, frame, []);
  const bike = createWorldBike(1, { x: 0, z: 0, yaw: 0 }, 1);
  bike.battery = createBattery({ charge });
  bike.tires = createTires({ pressure });
  return { rider, bike };
}

describe('rideTick systems', () => {
  it('Circle K floors a low pack without dumping a full one', () => {
    const { rider, bike } = seeded(0.12);
    const ck = circleKChargePoint({ x: 0, z: 0 });
    const next = stepRideWorld(
      { riders: [rider], bikes: [bike] },
      DT,
      { 1: idleIntent() },
      heightAt,
      [],
      [ck],
    );
    expect(next.bikes[0].battery.charge).toBeCloseTo(0.55);
    const full = seeded(1);
    const kept = stepRideWorld(
      { riders: [full.rider], bikes: [full.bike] },
      DT,
      { 1: idleIntent() },
      heightAt,
      [],
      [ck],
    );
    expect(kept.bikes[0].battery.charge).toBe(1);
  });

  it('dead pack is slower than a full Trail pack', () => {
    const dead = seeded(0);
    const live = seeded(1);
    const go = { 1: { ...idleIntent(), throttle: 1 } };
    let d = { riders: [dead.rider], bikes: [dead.bike] };
    let l = { riders: [live.rider], bikes: [live.bike] };
    for (let i = 0; i < 90; i += 1) {
      d = stepRideWorld(d, DT, go, heightAt);
      l = stepRideWorld(l, DT, go, heightAt);
    }
    expect(d.riders[0].bike.speed).toBeLessThan(l.riders[0].bike.speed);
    expect(l.bikes[0].battery.charge).toBeLessThan(1);
  });

  it('repair at a stop spends a tube on a flat', () => {
    const { rider, bike } = seeded(1, 0);
    bike.tires = createTires({ pressure: 0, flat: true, tubes: 1, patches: 0 });
    const next = stepRideWorld(
      { riders: [rider], bikes: [bike] },
      DT,
      { 1: { ...idleIntent(), repair: true } },
      heightAt,
    );
    expect(next.bikes[0].tires.pressure).toBe(1);
    expect(next.bikes[0].tires.tubes).toBe(0);
    expect(next.riders[0].toast.toLowerCase()).toMatch(/tube/);
  });
});
