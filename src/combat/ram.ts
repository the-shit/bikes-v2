/**
 * Ownership: bike-as-weapon ram damage. Speed → damage.
 * Talks via: events/state. No zombie internals.
 * Budget: keep this file under ~300 lines.
 */

export type RamHit = {
  damage: number;
};

export const RAM = {
  minSpeed: 6,
  contact: 1.55,
  base: 0.4,
  damagePerMs: 0.22,
  cooldown: 0.55,
} as const;

export function ramDamage(speed: number): RamHit {
  if (speed < RAM.minSpeed) {
    return { damage: 0 };
  }
  return { damage: RAM.base + (speed - RAM.minSpeed) * RAM.damagePerMs };
}

export type Pose2 = { x: number; z: number; id: number };

export function ramHits(
  origin: Pose2,
  speed: number,
  agents: readonly Pose2[],
  contact = RAM.contact,
): number[] {
  if (speed < RAM.minSpeed) {
    return [];
  }
  const hits: number[] = [];
  for (const a of agents) {
    if (Math.hypot(a.x - origin.x, a.z - origin.z) <= contact) {
      hits.push(a.id);
    }
  }
  return hits;
}
