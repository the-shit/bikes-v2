/**
 * Ownership: pre / turning / post flip state. One world, two skins.
 * Talks via: FlipState + events. Lighting/audio consume the skin, not this file.
 * Budget: keep this file under ~300 lines.
 */

export type FlipPhase = 'pre' | 'turning' | 'post';

export type FlipState = {
  phase: FlipPhase;
  t: number;
  progress: number;
};

export const FLIP = {
  turnDuration: 5.2,
} as const;

export function createFlip(): FlipState {
  return { phase: 'pre', t: 0, progress: 0 };
}

/** Tests / combat proofs that skip the intro start already flipped. */
export function createFlipped(): FlipState {
  return { phase: 'post', t: 0, progress: 1 };
}

export function beginFlip(state: FlipState): FlipState {
  if (state.phase !== 'pre') {
    return state;
  }
  return { phase: 'turning', t: 0, progress: 0 };
}

export function stepFlip(state: FlipState, dt: number): FlipState {
  const t = state.t + Math.max(0, dt);
  if (state.phase !== 'turning') {
    return { ...state, t };
  }
  const progress = Math.min(1, t / FLIP.turnDuration);
  if (progress >= 1) {
    return { phase: 'post', t: 0, progress: 1 };
  }
  return { phase: 'turning', t, progress };
}

export function zombiesEnabled(state: FlipState): boolean {
  return state.phase === 'post';
}

export function flipCue(from: FlipPhase, to: FlipPhase): string | null {
  if (from === 'pre' && to === 'turning') {
    return 'flip.sting';
  }
  if (from === 'turning' && to === 'post') {
    return 'flip.radio';
  }
  return null;
}
