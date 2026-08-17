/**
 * Ownership: rocks / molotovs / slingshot from the saddle.
 * Talks via: events/state. Aim comes from input intents.
 * Budget: keep this file under ~300 lines.
 */

export type ThrowableId = 'rock' | 'molotov' | 'slingshot';

export type ThrowableState = {
  equipped: ThrowableId | null;
};

export function createThrowables(): ThrowableState {
  return { equipped: null };
}

/** Stub. M1+. */
export function stepThrowables(state: ThrowableState, _dt: number): ThrowableState {
  return state;
}
