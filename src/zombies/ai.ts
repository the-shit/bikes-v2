/**
 * Ownership: per-zombie steering / chase / stumble.
 * Talks via: events/state. Do not import bike/ physics internals.
 * Budget: keep this file under ~300 lines.
 */

export type ZombieAi = {
  id: number;
  x: number;
  z: number;
};

/** Stub. M1. */
export function stepZombieAi(agent: ZombieAi, _dt: number): ZombieAi {
  return agent;
}
