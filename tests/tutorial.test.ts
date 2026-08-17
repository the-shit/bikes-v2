import { describe, expect, it } from 'vitest';
import {
  createTutorial,
  stepTutorial,
  tutorialPrompt,
} from '../src/world/tutorial';

const DT = 1 / 60;

describe('pre-flip tutorial', () => {
  it('walks throttle → steer → hop → charge → done', () => {
    let { state } = {
      state: createTutorial(),
    };
    expect(tutorialPrompt(state)).toMatch(/W /);

    let next = stepTutorial(state, DT, {
      speed: 5,
      steer: 0,
      hop: false,
      airborne: false,
      atCharge: false,
      dx: 10,
      dz: 0,
    });
    expect(next.state.step).toBe('steer');
    expect(next.ding).toBe(true);

    next = stepTutorial(next.state, DT, {
      speed: 5,
      steer: 0.5,
      hop: false,
      airborne: false,
      atCharge: false,
      dx: 1,
      dz: 0,
    });
    expect(next.state.step).toBe('hop');

    next = stepTutorial(next.state, DT, {
      speed: 8,
      steer: 0,
      hop: true,
      airborne: true,
      atCharge: false,
      dx: 1,
      dz: 0,
    });
    expect(next.state.step).toBe('charge');
    expect(tutorialPrompt(next.state)).toMatch(/Circle K/);

    next = stepTutorial(next.state, 0.8, {
      speed: 0,
      steer: 0,
      hop: false,
      airborne: false,
      atCharge: true,
      dx: 0,
      dz: 0,
    });
    expect(next.state.step).toBe('done');
    expect(tutorialPrompt(next.state)).toBe('');
  });

  it('stays on throttle until the bike actually rolls', () => {
    const next = stepTutorial(createTutorial(), DT, {
      speed: 0,
      steer: 1,
      hop: true,
      airborne: false,
      atCharge: true,
      dx: 0,
      dz: 0,
    });
    expect(next.state.step).toBe('throttle');
  });
});
