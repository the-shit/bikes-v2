/**
 * Ownership: Gamepad API → Intent adapter.
 * Talks via: Intent. Analog steer + trigger throttle/brake land here (M5).
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent, type Intent } from './intents';

export type GamepadAdapter = {
  sample(): Intent;
};

/** Stub. M5. */
export function createGamepadAdapter(): GamepadAdapter {
  return {
    sample() {
      return idleIntent();
    },
  };
}
