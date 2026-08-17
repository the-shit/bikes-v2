/**
 * Ownership: Gamepad API → Intent adapter.
 * Talks via: Intent. Analog steer + trigger throttle/brake land here (M5).
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent } from './intents.js';

/**
 * @typedef {object} GamepadAdapter
 * @property {() => import('./intents.js').Intent} sample
 */

/** Stub. M5. @returns {GamepadAdapter} */
export function createGamepadAdapter() {
  return {
    sample() {
      return idleIntent();
    },
  };
}
