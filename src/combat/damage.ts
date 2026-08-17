/**
 * Ownership: health / hit resolution for anything that can break.
 * Talks via: events/state. Callers pass ids, not foreign objects.
 * Budget: keep this file under ~300 lines.
 */

export type Health = {
  hp: number;
  max: number;
};

export function createHealth(max = 1): Health {
  return { hp: max, max };
}

/** Stub. M1. */
export function applyDamage(health: Health, amount: number): Health {
  const hp = Math.max(0, health.hp - amount);
  return { ...health, hp };
}
