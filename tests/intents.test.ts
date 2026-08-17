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
      lock: false,
      mount: false,
      repair: false,
      assistUp: false,
      assistDown: false,
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
    expect(intent.lock).toBe(false);
    expect(intent.brake).toBe(0);
    setKey(state, 'Tab', true);
    expect(sampleInput(state).lock).toBe(false);
    setKey(state, 'KeyQ', true);
    expect(sampleInput(state).lock).toBe(true);
    setKey(state, 'Space', true);
    expect(sampleInput(state).brake).toBe(1);
  });

  it('maps R to remount and leaves F unbound (F-Widget)', () => {
    const state = createInputState();
    setKey(state, 'KeyF', true);
    expect(sampleInput(state).mount).toBe(false);
    setKey(state, 'KeyF', false);
    setKey(state, 'KeyR', true);
    setKey(state, 'BracketRight', true);
    const intent = sampleInput(state);
    expect(intent.mount).toBe(true);
    expect(intent.repair).toBe(false);
    expect(intent.assistUp).toBe(true);
    expect(intent.lock).toBe(false);
  });
});
