/**
 * Ownership: where and when zombies enter the world.
 * Talks via: entity ids + events. Do not import combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

export type SpawnRequest = {
  x: number;
  z: number;
  kind: string;
};

/** Stub. M1 (one type) then M4 (variety). */
export function nextSpawns(_dt: number): SpawnRequest[] {
  return [];
}
