/**
 * Ownership: keyboard → Intent adapter.
 * Talks via: Intent. Do not leak key codes into bike/combat/world.
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent } from './intents.js';

/**
 * @typedef {object} KeyboardAdapter
 * @property {() => import('./intents.js').Intent} sample
 */

/** Stub. M1 wires WASD / arrows. @returns {KeyboardAdapter} */
export function createKeyboardAdapter() {
  return {
    sample() {
      return idleIntent();
    },
  };
}
