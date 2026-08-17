/**
 * Ownership: keyboard → Intent adapter.
 * Talks via: Intent. Do not leak key codes into bike/combat/world.
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent, type Intent } from './intents';

export type KeyboardAdapter = {
  sample(): Intent;
};

/** Stub. M1 wires WASD / arrows. */
export function createKeyboardAdapter(): KeyboardAdapter {
  return {
    sample() {
      return idleIntent();
    },
  };
}
