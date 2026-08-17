import { describe, expect, it } from 'vitest';
import {
  createTires,
  repairTires,
  stepTires,
  usePatch,
  useTube,
} from '../src/bike/tires';

describe('tires', () => {
  it('hazards drain pressure at speed and flatten', () => {
    let tires = createTires();
    const hazard = { x: 0, z: 0, r: 2, severity: 1 };
    const rolling = { x: 0, z: 0, speed: 14 };
    for (let i = 0; i < 20 && !tires.flat; i += 1) {
      tires = stepTires(tires, rolling, 0.2, [hazard]).tires;
    }
    expect(tires.flat).toBe(true);
    expect(tires.pressure).toBe(0);
  });

  it('standing still in thorns does not pop the tire', () => {
    const step = stepTires(
      createTires(),
      { x: 0, z: 0, speed: 0 },
      1,
      [{ x: 0, z: 0, r: 2, severity: 1 }],
    );
    expect(step.tires.pressure).toBe(1);
    expect(step.tires.flat).toBe(false);
  });

  it('tube restores full; patch is partial; both need a near-stop', () => {
    const flat = createTires({ pressure: 0, flat: true, tubes: 1, patches: 2 });
    expect(useTube(flat, 8).toast).toMatch(/Stop/);
    const tubed = useTube(flat, 0);
    expect(tubed.tires.pressure).toBe(1);
    expect(tubed.tires.flat).toBe(false);
    expect(tubed.tires.tubes).toBe(0);

    const soft = createTires({ pressure: 0.2, tubes: 0, patches: 1 });
    expect(usePatch(soft, 8).toast).toMatch(/Slow/);
    const patched = usePatch(soft, 0);
    expect(patched.tires.pressure).toBeCloseTo(0.58);
    expect(patched.tires.patches).toBe(0);
  });

  it('smart repair uses a tube when flat', () => {
    const flat = createTires({ pressure: 0, flat: true, tubes: 1, patches: 2 });
    const next = repairTires(flat, 0);
    expect(next.tires.pressure).toBe(1);
    expect(next.tires.tubes).toBe(0);
    expect(next.tires.patches).toBe(2);
  });

  it('soft-leaks when already low and rolling', () => {
    const start = createTires({ pressure: 0.3 });
    let tires = start;
    for (let i = 0; i < 120; i += 1) {
      tires = stepTires(tires, { x: 0, z: 0, speed: 8 }, 1 / 60).tires;
    }
    expect(tires.pressure).toBeLessThan(start.pressure);
  });
});
