/**
 * Ownership: pure key-set → Intent. DOM wiring stays in keyboard.ts.
 * Talks via: Intent. Gameplay must not read KeyboardEvent.
 * Budget: keep this file under ~300 lines.
 */

import { clampAxis, idleIntent, type Intent } from './intents';

export const DEFAULT_BINDINGS = Object.freeze({
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown', 'Space'],
  hop: ['ShiftLeft', 'ShiftRight'],
  melee: ['KeyE'],
  lock: ['KeyQ'],
  mount: ['KeyR'],
  assistUp: ['BracketRight'],
  assistDown: ['BracketLeft'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
});

export type Bindings = typeof DEFAULT_BINDINGS;

export type InputState = {
  down: Set<string>;
  bindings: Bindings;
};

export function createInputState(bindings: Bindings = DEFAULT_BINDINGS): InputState {
  return { down: new Set(), bindings: { ...bindings } };
}

export function setKey(state: InputState, code: string, isDown: boolean): void {
  if (isDown) {
    state.down.add(code);
  } else {
    state.down.delete(code);
  }
}

export function isTypingTarget(el: EventTarget | null | undefined): boolean {
  if (!el || typeof el !== 'object') {
    return false;
  }
  const node = el as HTMLElement;
  const tag = node.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return Boolean(node.isContentEditable);
}

export function sampleInput(state: InputState): Intent {
  const { down, bindings } = state;
  const any = (codes: readonly string[]) => codes.some((c) => down.has(c));
  let steer = 0;
  if (any(bindings.steerLeft)) {
    steer += 1;
  }
  if (any(bindings.steerRight)) {
    steer -= 1;
  }
  return {
    ...idleIntent(),
    throttle: any(bindings.throttle) ? 1 : 0,
    brake: any(bindings.brake) ? 1 : 0,
    steer: clampAxis(steer),
    hop: any(bindings.hop),
    melee: any(bindings.melee),
    lock: any(bindings.lock),
    mount: any(bindings.mount),
    assistUp: any(bindings.assistUp),
    assistDown: any(bindings.assistDown),
  };
}
