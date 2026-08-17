/**
 * Ownership: timed melee swings from the saddle.
 * Talks via: events/state. Do not import zombies/ AI internals.
 * Budget: keep this file under ~300 lines.
 */

export type MeleeState = {
  cooldown: number;
};

export function createMelee(): MeleeState {
  return { cooldown: 0 };
}

/** Stub. M1. */
export function stepMelee(state: MeleeState, _dt: number): MeleeState {
  return state;
}
