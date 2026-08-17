/**
 * Ownership: bike-as-weapon ram / stomp / slam damage.
 * Talks via: events/state. Speed → damage. No zombie internals.
 * Budget: keep this file under ~300 lines.
 */

export type RamHit = {
  damage: number;
};

/** Stub. M1. */
export function ramDamage(_speed: number): RamHit {
  return { damage: 0 };
}
