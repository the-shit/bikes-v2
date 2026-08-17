/**
 * Ownership: tire pressure, flats, tubes/patches.
 * Talks via: events/state. Hazards come from world/, not imported.
 * Budget: keep this file under ~300 lines.
 */

export type TireState = {
  pressure: number;
  flat: boolean;
  tubes: number;
  patches: number;
};

export function createTires(): TireState {
  return { pressure: 1, flat: false, tubes: 1, patches: 2 };
}

/** Stub. M2 ports v1 feel constants after evaluation. */
export function stepTires(state: TireState, _dt: number): TireState {
  return state;
}
