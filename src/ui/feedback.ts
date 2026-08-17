/**
 * Ownership: in-ride feedback capture → jsonl intake.
 * Talks via: snapshot from core state. Widget ships in M1 (todo 520).
 * Budget: keep this file under ~300 lines.
 */

export type FeedbackWidget = {
  open(): void;
};

/** Stub. Do not invent a UI here — M1 owns the seamless capture. */
export function createFeedback(): FeedbackWidget {
  return {
    open() {},
  };
}
