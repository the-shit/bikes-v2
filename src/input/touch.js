/**
 * Ownership: pointer/touch drag → Intent adapter.
 * Talks via: Intent. Not a D-pad. M5 owns the real mapping.
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent } from './intents.js';

/**
 * @typedef {object} TouchAdapter
 * @property {() => import('./intents.js').Intent} sample
 */

/** Stub. M5. @returns {TouchAdapter} */
export function createTouchAdapter() {
  return {
    sample() {
      return idleIntent();
    },
  };
}
