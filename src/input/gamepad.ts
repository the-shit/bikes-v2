/**
 * Ownership: Gamepad API → Intent. Analog steer, trigger throttle/brake.
 * Talks via: Intent. Inject `read` so tests/wraps need no window.
 * Budget: keep this file under ~300 lines.
 */

import { clampAxis, idleIntent, type Intent } from './intents';

export type PadButton = { pressed: boolean; value: number };

export type PadSnapshot = {
  axes: readonly number[];
  buttons: readonly PadButton[];
};

export type GamepadAdapter = {
  sample(): Intent;
};

export const GAMEPAD = {
  deadzone: 0.18,
  steerAxis: 0,
  brakeBtn: 6,
  throttleBtn: 7,
  hop: 0,
  mount: 1,
  melee: 2,
  lock: 3,
} as const;

export function applyDeadzone(value: number, zone = GAMEPAD.deadzone): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const a = Math.abs(value);
  if (a < zone) {
    return 0;
  }
  const scaled = (a - zone) / (1 - zone);
  return clampAxis(Math.sign(value) * scaled);
}

export function intentFromPad(pad: PadSnapshot): Intent {
  const axis = pad.axes[GAMEPAD.steerAxis] ?? 0;
  const throttle = buttonValue(pad, GAMEPAD.throttleBtn);
  const brake = buttonValue(pad, GAMEPAD.brakeBtn);
  return {
    ...idleIntent(),
    steer: applyDeadzone(-axis),
    throttle,
    brake,
    hop: pressed(pad, GAMEPAD.hop),
    mount: pressed(pad, GAMEPAD.mount),
    melee: pressed(pad, GAMEPAD.melee),
    lock: pressed(pad, GAMEPAD.lock),
  };
}

export function createGamepadAdapter(opts?: {
  read?: () => ReadonlyArray<PadSnapshot | null>;
}): GamepadAdapter {
  const read = opts?.read ?? readNavigatorPads;
  return {
    sample() {
      const pads = read();
      for (const pad of pads) {
        if (pad) {
          return intentFromPad(pad);
        }
      }
      return idleIntent();
    },
  };
}

function buttonValue(pad: PadSnapshot, index: number): number {
  const btn = pad.buttons[index];
  if (!btn) {
    return 0;
  }
  const v = Number(btn.value);
  if (Number.isFinite(v) && v > 0) {
    return clamp01(v);
  }
  return btn.pressed ? 1 : 0;
}

function pressed(pad: PadSnapshot, index: number): boolean {
  return Boolean(pad.buttons[index]?.pressed);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function readNavigatorPads(): Array<PadSnapshot | null> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const fn = nav?.getGamepads;
  if (typeof fn !== 'function') {
    return [];
  }
  const raw = fn.call(nav);
  const out: Array<PadSnapshot | null> = [];
  for (let i = 0; i < raw.length; i += 1) {
    const pad = raw[i];
    out.push(
      pad
        ? { axes: Array.from(pad.axes), buttons: pad.buttons.map(copyBtn) }
        : null,
    );
  }
  return out;
}

function copyBtn(b: GamepadButton): PadButton {
  return { pressed: b.pressed, value: b.value };
}
