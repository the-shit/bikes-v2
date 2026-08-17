/**
 * Ownership: group spawn waves and pressure.
 * Talks via: events. Individual steering stays in ai.ts.
 * Budget: keep this file under ~300 lines.
 */

export type HordeState = {
  wave: number;
};

export function createHorde(): HordeState {
  return { wave: 0 };
}

/** Stub. M4. */
export function stepHorde(state: HordeState, _dt: number): HordeState {
  return state;
}
