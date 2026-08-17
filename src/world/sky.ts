/**
 * Ownership: post-flip day/night clock. Pre-flip stays Mesa afternoon.
 * Talks via: SkyState. View/hordes read nightAmt; no WebGL here.
 * Budget: keep this file under ~300 lines.
 */

export type SkyPhase = 'day' | 'dusk' | 'night' | 'dawn';

export type SkyState = {
  t: number;
  nightAmt: number;
  phase: SkyPhase;
  label: string;
};

export const SKY = {
  period: 180,
  /** Land the flip at dusk, not high noon. */
  postStart: 40,
} as const;

export function createSky(t = 0): SkyState {
  return sampleSky(t);
}

export function stepSky(
  sky: SkyState,
  dt: number,
  flipped: boolean,
): SkyState {
  if (!flipped) {
    return createSky(0);
  }
  return sampleSky(sky.t + Math.max(0, dt));
}

export function sampleSky(elapsed: number): SkyState {
  const period = SKY.period;
  const t = ((elapsed % period) + period) % period;
  const cycle = t / period;
  const nightRaw = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
  const nightAmt = Math.max(0, Math.min(1, (nightRaw - 0.35) / 0.45));
  let phase: SkyPhase = 'day';
  if (nightAmt <= 0) {
    phase = 'day';
  } else if (nightAmt < 0.55) {
    phase = cycle < 0.5 ? 'dusk' : 'dawn';
  } else {
    phase = 'night';
  }
  const label =
    phase === 'night'
      ? 'NIGHT'
      : phase === 'dusk'
        ? 'DUSK'
        : phase === 'dawn'
          ? 'DAWN'
          : 'DAY';
  return { t, nightAmt, phase, label };
}
