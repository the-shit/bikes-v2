import { describe, expect, it } from 'vitest';
import { createAirState, stepAir } from '../src/bike/air';
import { createBikeState } from '../src/bike/physics';

const DT = 1 / 60;

describe('air / bunny hop', () => {
  it('launches when hop is edged at speed', () => {
    const bike = createBikeState({ speed: 12, y: 0 });
    const step = stepAir(createAirState(), bike, 0, DT, true);
    expect(step.air.airborne).toBe(true);
    expect(step.air.vy).toBeGreaterThan(4);
    expect(step.y).toBeGreaterThan(0);
  });

  it('does not hop below min speed', () => {
    const bike = createBikeState({ speed: 1, y: 0 });
    const step = stepAir(createAirState(), bike, 0, DT, true);
    expect(step.air.airborne).toBe(false);
  });

  it('returns to ground under gravity', () => {
    const bike = createBikeState({ speed: 14, y: 0 });
    let air = createAirState();
    let y = 0;
    let speed = 14;
    const launched = stepAir(air, { ...bike, speed, y }, 0, DT, true);
    air = launched.air;
    y = launched.y;
    speed = launched.speed;
    let landed = false;
    for (let i = 0; i < 180; i += 1) {
      const step = stepAir(air, { ...bike, speed, y }, 0, DT, false);
      air = step.air;
      y = step.y;
      speed = step.speed;
      if (!air.airborne) {
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
    expect(y).toBe(0);
  });
});
