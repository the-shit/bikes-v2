/**
 * Ownership: one-keystroke playtest capture → feedback.jsonl (M1).
 * Talks via: game-state snapshot. Intake is out of process.
 * Budget: keep this file under ~300 lines.
 */

/**
 * @typedef {object} FeedbackWidget
 * @property {() => void} capture
 */

/** Stub. M1 wires the v1 jsonl pipeline. @returns {FeedbackWidget} */
export function createFeedback() {
  return {
    capture() {},
  };
}
