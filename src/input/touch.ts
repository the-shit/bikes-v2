/**
 * Ownership: pointer/touch drag → Intent adapter.
 * Talks via: Intent. Not a D-pad. M5 owns the real mapping.
 * Budget: keep this file under ~300 lines.
 */

import { idleIntent, type Intent } from './intents';

export type TouchAdapter = {
  sample(): Intent;
};

/** Stub. M5. */
export function createTouchAdapter(): TouchAdapter {
  return {
    sample() {
      return idleIntent();
    },
  };
}
