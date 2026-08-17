/**
 * Ownership: assist battery drain + charge.
 * Talks via: events/state. Charge points live in world/, not here.
 * Budget: keep this file under ~300 lines.
 */

export type BatteryState = {
  charge: number;
};

export function createBattery(): BatteryState {
  return { charge: 1 };
}

/** Stub. M2. */
export function stepBattery(state: BatteryState, _dt: number): BatteryState {
  return state;
}
