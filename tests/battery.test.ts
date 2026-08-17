import { describe, expect, it } from 'vitest';
import {
  BATTERY_DEFAULTS,
  createBattery,
  cycleAssist,
  fillCharge,
  floorCharge,
  stepBattery,
} from '../src/bike/battery';

const DT = 1 / 60;

describe('battery', () => {
  it('starts full on Trail', () => {
    const b = createBattery();
    expect(b.charge).toBe(1);
    expect(b.assist).toBe(BATTERY_DEFAULTS.startAssist);
  });

  it('drains under throttle with assist, not while coasting', () => {
    let drain = createBattery();
    let coast = createBattery();
    for (let i = 0; i < 180; i += 1) {
      drain = stepBattery(drain, 1, DT).battery;
      coast = stepBattery(coast, 0, DT).battery;
    }
    expect(drain.charge).toBeLessThan(0.96);
    expect(coast.charge).toBeGreaterThanOrEqual(0.999);
  });

  it('toasts when the pack dies', () => {
    const step = stepBattery(createBattery({ charge: 0.02, assist: 2 }), 1, 2);
    expect(step.battery.charge).toBeLessThanOrEqual(BATTERY_DEFAULTS.dead);
    expect(step.toast.toLowerCase()).toMatch(/dead|legs/);
  });

  it('Off assist does not drain; garage fill tops the pack', () => {
    let off = createBattery({ charge: 0.5, assist: 0 });
    off = stepBattery(off, 1, 1).battery;
    expect(off.charge).toBeGreaterThan(0.5);
    expect(fillCharge(createBattery({ charge: 0.2 }), 1).charge).toBe(1);
    expect(floorCharge(createBattery({ charge: 0.2 }), 0.55).charge).toBeCloseTo(
      0.55,
    );
    expect(floorCharge(createBattery({ charge: 0.8 }), 0.55).charge).toBeCloseTo(
      0.8,
    );
  });

  it('cycles assist names', () => {
    const next = cycleAssist(createBattery(), 1);
    expect(next.battery.assist).toBe(3);
    expect(next.toast).toMatch(/Boost/);
  });
});
