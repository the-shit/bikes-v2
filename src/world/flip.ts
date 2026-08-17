/**
 * Ownership: pre/post apocalypse flip state (lighting, props, audio).
 * Talks via: FlipState events. One world, two skins.
 * Budget: keep this file under ~300 lines.
 */

export type FlipPhase = 'pre' | 'turning' | 'post';

export type FlipState = {
  phase: FlipPhase;
};

export function createFlip(): FlipState {
  return { phase: 'pre' };
}

/** Stub. M3. */
export function stepFlip(state: FlipState, _dt: number): FlipState {
  return state;
}
