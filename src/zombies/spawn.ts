/**
 * Ownership: where and when zombies enter the world.
 * Talks via: entity ids + events. Do not import combat/ internals.
 * Budget: keep this file under ~300 lines.
 */

import { createShambler, type Shambler } from './ai';

export type SpawnRequest = {
  x: number;
  z: number;
  kind: string;
};

/** M1 seeds a fixed shambler line; no timed waves. */
export function nextSpawns(_dt: number): SpawnRequest[] {
  return [];
}

export function seedShamblers(
  points: ReadonlyArray<{ x: number; z: number }>,
  heightAt: (x: number, z: number) => number,
): Shambler[] {
  return points.map((p, i) => createShambler(i + 1, p.x, p.z, heightAt(p.x, p.z)));
}
