/**
 * Ownership: rocks / molotovs / slingshot from the saddle.
 * Talks via: events/state. Aim comes from input intents.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {'rock' | 'molotov' | 'slingshot'} ThrowableId
 */

/**
 * @typedef {object} ThrowableState
 * @property {ThrowableId | null} equipped
 */

/** @returns {ThrowableState} */
export function createThrowables() {
  return { equipped: null };
}

/** Stub. M1+. @param {ThrowableState} state @param {number} _dt @returns {ThrowableState} */
export function stepThrowables(state, _dt) {
  return state;
}
