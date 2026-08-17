/**
 * Ownership: assist battery drain + charge.
 * Talks via: events/state. Charge points live in world/, not here.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} BatteryState
 * @property {number} charge
 */

/** @returns {BatteryState} */
export function createBattery() {
  return { charge: 1 };
}

/** Stub. M2. @param {BatteryState} state @param {number} _dt @returns {BatteryState} */
export function stepBattery(state, _dt) {
  return state;
}
