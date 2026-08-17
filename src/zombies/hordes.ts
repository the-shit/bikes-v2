/**
 * Ownership: canned wave pressure (not Asgard). Individual AI stays in ai.ts.
 * Talks via: spawn requests. Fully playable AI-off.
 * Budget: keep this file under ~300 lines.
 */

import type { ZombieKind } from './ai';

export type HordeState = {
  wave: number;
  t: number;
  nextIn: number;
};

export type HordeSpawn = {
  x: number;
  z: number;
  kind: ZombieKind;
};

export const HORDE = {
  dayGap: 16,
  nightGap: 9,
  dayCap: 12,
  nightCap: 18,
  bunch: 3,
} as const;

export function createHorde(): HordeState {
  return { wave: 0, t: 0, nextIn: HORDE.dayGap };
}

export function stepHorde(
  state: HordeState,
  dt: number,
  opts: {
    flipped: boolean;
    nightAmt: number;
    live: number;
    pins: readonly { x: number; z: number }[];
  },
): { horde: HordeState; spawns: HordeSpawn[] } {
  if (!opts.flipped || !opts.pins.length) {
    return { horde: state, spawns: [] };
  }
  const night = opts.nightAmt > 0.45;
  const cap = night ? HORDE.nightCap : HORDE.dayCap;
  const gap = night ? HORDE.nightGap : HORDE.dayGap;
  const t = state.t + dt;
  let nextIn = state.nextIn - dt;
  let wave = state.wave;
  const spawns: HordeSpawn[] = [];
  if (nextIn <= 0 && opts.live < cap) {
    wave += 1;
    nextIn = gap;
    const n = Math.min(HORDE.bunch, cap - opts.live);
    for (let i = 0; i < n; i += 1) {
      const pin = opts.pins[(wave + i) % opts.pins.length];
      spawns.push({
        x: pin.x + ((i % 2 === 0 ? 1 : -1) * 2.4),
        z: pin.z + i * 1.6,
        kind: pickKind(wave, night, i),
      });
    }
  }
  return { horde: { wave, t, nextIn }, spawns };
}

function pickKind(wave: number, night: boolean, i: number): ZombieKind {
  if (wave >= 4 && i === 0) {
    return 'bruiser';
  }
  if (night || wave >= 2) {
    return i === 1 ? 'sprinter' : 'shambler';
  }
  return 'shambler';
}
