import { describe, expect, it } from 'vitest';
import {
  applyDeadzone,
  createGamepadAdapter,
  GAMEPAD,
  intentFromPad,
  type PadSnapshot,
} from '../src/input/gamepad';
import { idleIntent } from '../src/input/intents';

function pad(partial: Partial<PadSnapshot> = {}): PadSnapshot {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  return { axes: [0, 0, 0, 0], buttons, ...partial };
}

describe('gamepad adapter', () => {
  it('maps left-stick X to steer (left = +steer) with a deadzone', () => {
    expect(applyDeadzone(0.05)).toBe(0);
    expect(intentFromPad(pad({ axes: [-1, 0] })).steer).toBeCloseTo(1);
    expect(intentFromPad(pad({ axes: [1, 0] })).steer).toBeCloseTo(-1);
    expect(intentFromPad(pad({ axes: [GAMEPAD.deadzone / 2, 0] })).steer).toBe(0);
  });

  it('maps analog triggers to throttle and brake', () => {
    const buttons = pad().buttons.slice();
    const next = [...buttons];
    next[GAMEPAD.throttleBtn] = { pressed: true, value: 0.7 };
    next[GAMEPAD.brakeBtn] = { pressed: true, value: 0.4 };
    const intent = intentFromPad(pad({ buttons: next }));
    expect(intent.throttle).toBeCloseTo(0.7);
    expect(intent.brake).toBeCloseTo(0.4);
  });

  it('maps LB to use and RB to fire', () => {
    const buttons = pad().buttons.slice();
    const next = [...buttons];
    next[GAMEPAD.use] = { pressed: true, value: 1 };
    next[GAMEPAD.fire] = { pressed: true, value: 1 };
    const intent = intentFromPad(pad({ buttons: next }));
    expect(intent.use).toBe(true);
    expect(intent.fire).toBe(true);
    expect(intentFromPad(pad()).use).toBe(false);
    expect(intentFromPad(pad()).fire).toBe(false);
  });

  it('samples the first live pad via injected read (no window)', () => {
    const buttons = pad().buttons.slice();
    const live = [...buttons];
    live[GAMEPAD.throttleBtn] = { pressed: true, value: 1 };
    const adapter = createGamepadAdapter({
      read: () => [null, pad({ axes: [-0.9, 0], buttons: live })],
    });
    const intent = adapter.sample();
    expect(intent.throttle).toBe(1);
    expect(intent.steer).toBeGreaterThan(0.5);
    expect(createGamepadAdapter({ read: () => [] }).sample()).toEqual(idleIntent());
  });
});
