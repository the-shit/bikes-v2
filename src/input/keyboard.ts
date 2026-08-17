/**
 * Ownership: keyboard → Intent adapter.
 * Talks via: Intent. Do not leak key codes into bike/combat/world.
 * Budget: keep this file under ~300 lines.
 */

import {
  createInputState,
  isTypingTarget,
  sampleInput,
  setKey,
  type InputState,
} from './bindings';
import { idleIntent, type Intent } from './intents';

export type KeyboardAdapter = {
  sample(): Intent;
  dispose(): void;
};

const RIDE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export function createKeyboardAdapter(
  target: Window | Document | null = typeof window !== 'undefined' ? window : null,
): KeyboardAdapter {
  const state: InputState = createInputState();
  if (!target || typeof target.addEventListener !== 'function') {
    return {
      sample() {
        return idleIntent();
      },
      dispose() {},
    };
  }

  const onDown = (event: Event) => {
    const e = event as KeyboardEvent;
    if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) {
      return;
    }
    if (!e.code) {
      return;
    }
    setKey(state, e.code, true);
    if (RIDE_CODES.has(e.code)) {
      e.preventDefault();
    }
  };
  const onUp = (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.code) {
      setKey(state, e.code, false);
    }
  };
  const onBlur = () => {
    state.down.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);

  return {
    sample() {
      return sampleInput(state);
    },
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
