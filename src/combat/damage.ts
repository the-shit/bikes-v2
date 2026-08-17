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

export function applyDamage(health: Health, amount: number): Health {
  const dmg = Math.max(0, amount);
  const hp = Math.max(0, health.hp - dmg);
  return { ...health, hp };
}

export function isDead(health: Health): boolean {
  return health.hp <= 0;
}
