import { describe, expect, it } from 'vitest';
import {
  createInputState,
  sampleInput,
  setKey,
} from '../src/input/bindings';
import { clampAxis, idleIntent } from '../src/input/intents';

describe('intents', () => {
  it('starts idle (no keys implied)', () => {
    expect(idleIntent()).toEqual({
      throttle: 0,
      steer: 0,
      brake: 0,
      lookX: 0,
      lookY: 0,
      fire: false,
      melee: false,
      hop: false,
      mount: false,
    });
  });

  it('clamps device axes', () => {
    expect(clampAxis(2)).toBe(1);
    expect(clampAxis(-4)).toBe(-1);
    expect(clampAxis(0.25)).toBe(0.25);
  });

  it('maps WASD / Space / Shift / E without leaking codes', () => {
    const state = createInputState();
    setKey(state, 'KeyW', true);
    setKey(state, 'KeyA', true);
    setKey(state, 'ShiftLeft', true);
    setKey(state, 'KeyE', true);
    const intent = sampleInput(state);
    expect(intent.throttle).toBe(1);
    expect(intent.steer).toBe(1);
    expect(intent.hop).toBe(true);
    expect(intent.melee).toBe(true);
    expect(intent.brake).toBe(0);
    setKey(state, 'Space', true);
    expect(sampleInput(state).brake).toBe(1);
  });
});
