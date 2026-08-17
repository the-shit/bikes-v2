/**
 * Ownership: charge-point poses (home garage + Circle K).
 * Talks via: ChargePoint data. Apply via bike/service — no bike internals.
 * Budget: keep this file under ~300 lines.
 */

export type ChargeKind = 'garage' | 'circlek';

export type ChargePoint = {
  id: string;
  kind: ChargeKind;
  name: string;
  x: number;
  z: number;
  r: number;
};

/** v1 landmarks.json — SW corner Baseline & Sossaman. */
export const CIRCLE_K_PIN = Object.freeze({
  x: -95.58,
  z: 400.2,
  lat: 33.379065,
  lon: -111.667828,
});

export const CHARGE_DEFAULTS = {
  garageR: 10,
  circleKR: 14,
} as const;

export function garageChargePoint(
  carport: { x: number; z: number },
  r = CHARGE_DEFAULTS.garageR,
): ChargePoint {
  return {
    id: 'garage',
    kind: 'garage',
    name: 'Home garage',
    x: carport.x,
    z: carport.z,
    r,
  };
}

export function circleKChargePoint(
  pin: { x: number; z: number } = CIRCLE_K_PIN,
  r = CHARGE_DEFAULTS.circleKR,
): ChargePoint {
  return {
    id: 'circlek',
    kind: 'circlek',
    name: 'Circle K',
    x: pin.x,
    z: pin.z,
    r,
  };
}

export function nearCharge(
  x: number,
  z: number,
  points: readonly ChargePoint[],
): ChargePoint | null {
  let best: ChargePoint | null = null;
  let bestD = Infinity;
  for (const p of points) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d <= p.r && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function chargeHint(
  x: number,
  z: number,
  points: readonly ChargePoint[],
): string {
  const here = nearCharge(x, z, points);
  if (here) {
    return here.kind === 'circlek'
      ? 'Circle K slushie juice in range'
      : 'Garage charger in range';
  }
  const ck = points.find((p) => p.kind === 'circlek');
  if (!ck) {
    return '';
  }
  const d = Math.hypot(x - ck.x, z - ck.z);
  return `CK ${d.toFixed(0)}m`;
}
