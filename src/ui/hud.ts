/**
 * Ownership: play HUD (speed, battery, tires, status).
 * Talks via: read-only snapshots. Feedback widget is ui/feedback.ts (M1).
 * Budget: keep this file under ~300 lines.
 */

export type Hud = {
  update(): void;
};

/** Stub. M1. */
export function createHud(): Hud {
  return {
    update() {},
  };
}
