import { describe, expect, it } from 'vitest';
import { createWorldBike } from '../src/bike/mount';
import { applyChargeProfile, CIRCLE_K_PROFILE, GARAGE_PROFILE } from '../src/bike/service';
import { createTires } from '../src/bike/tires';
import {
  CIRCLE_K_PIN,
  circleKChargePoint,
  garageChargePoint,
  nearCharge,
} from '../src/world/charge';

describe('charge points', () => {
  it('garage fills pack + kits; Circle K only floors charge', () => {
    const empty = createWorldBike(1);
    empty.battery.charge = 0.1;
    empty.tires = createTires({ tubes: 0, patches: 0, pressure: 0.2, flat: false });
    const home = applyChargeProfile(empty, GARAGE_PROFILE);
    expect(home.changed).toBe(true);
    expect(home.bike.battery.charge).toBe(1);
    expect(home.bike.tires.tubes).toBeGreaterThan(0);
    expect(home.bike.tires.pressure).toBe(1);

    const mid = applyChargeProfile(empty, CIRCLE_K_PROFILE);
    expect(mid.bike.battery.charge).toBeCloseTo(0.55);
    expect(mid.bike.tires.pressure).toBeCloseTo(0.85);
  });

  it('range check uses real Circle K pin', () => {
    const garage = garageChargePoint({ x: 0, z: 0 });
    const ck = circleKChargePoint();
    expect(nearCharge(0, 0, [garage, ck])?.kind).toBe('garage');
    expect(nearCharge(CIRCLE_K_PIN.x, CIRCLE_K_PIN.z, [garage, ck])?.kind).toBe(
      'circlek',
    );
    expect(nearCharge(200, 200, [garage, ck])).toBeNull();
    expect(ck.x).toBeCloseTo(-95.58, 1);
    expect(ck.z).toBeCloseTo(400.2, 1);
  });
});
