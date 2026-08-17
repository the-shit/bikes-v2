import { describe, expect, it } from 'vitest';
import {
  FIXED_DT,
  FPS_WINDOW,
  MAX_FRAME_DT,
  MAX_STEPS,
  advanceLoop,
  createLoop,
} from '../src/core/loop.js';

describe('fixed-timestep loop', () => {
  it('ticks once when the frame equals the step', () => {
    const ticks = [];
    const renders = [];
    const state = createLoop();
    advanceLoop(state, FIXED_DT, {
      tick: (dt) => ticks.push(dt),
      render: (alpha) => renders.push(alpha),
    });
    expect(ticks).toEqual([FIXED_DT]);
    expect(state.simTime).toBeCloseTo(FIXED_DT);
    expect(renders).toHaveLength(1);
    expect(renders[0]).toBeCloseTo(0);
  });

  it('catches up multiple steps on a long frame', () => {
    let ticks = 0;
    const state = createLoop();
    advanceLoop(state, FIXED_DT * 3, {
      tick: () => {
        ticks += 1;
      },
      render: () => {},
    });
    expect(ticks).toBe(3);
    expect(state.simTime).toBeCloseTo(FIXED_DT * 3);
  });

  it('clamps a huge frame, then drains leftover with MAX_STEPS', () => {
    const state = createLoop();
    let ticks = 0;
    advanceLoop(state, 2, {
      tick: () => {
        ticks += 1;
      },
      render: () => {},
    });
    expect(ticks).toBe(Math.floor(MAX_FRAME_DT / FIXED_DT));

    state.accumulator = FIXED_DT * 20;
    ticks = 0;
    advanceLoop(state, 0, {
      tick: () => {
        ticks += 1;
      },
      render: () => {},
    });
    expect(ticks).toBe(MAX_STEPS);
    expect(state.accumulator).toBe(0);
  });

  it('reports fps after the sample window', () => {
    const state = createLoop();
    const handlers = { tick() {}, render() {} };
    const frames = Math.ceil(FPS_WINDOW / FIXED_DT) + 1;
    for (let i = 0; i < frames; i += 1) {
      advanceLoop(state, FIXED_DT, handlers);
    }
    expect(state.fps).toBeGreaterThan(50);
    expect(state.fps).toBeLessThan(70);
  });
});
