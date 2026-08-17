/**
 * Ownership: play HUD (speed, battery, tires, status).
 * Talks via: read-only snapshots. Feedback widget is ui/feedback.js (M1).
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} Hud
 * @property {() => void} update
 */

/** Stub. M1. @returns {Hud} */
export function createHud() {
  return {
    update() {},
  };
}
