/**
 * Ownership: charge-point poses (home garage + Circle K).
 * Talks via: ChargePoint data. Apply via bike/service — no bike internals.
 * Budget: keep this file under ~300 lines.
 */

export type ChargeKind = 'garage' | 'circlek' | 'landmark';

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
    if (here.kind === 'circlek') {
      return 'Circle K slushie juice in range';
    }
    if (here.kind === 'landmark') {
      return `${here.name} juice in range`;
    }
    return 'Garage charger in range';
  }
  const far = nearestNamed(x, z, points);
  if (!far) {
    return '';
  }
  const d = Math.hypot(x - far.x, z - far.z);
  const tag = far.kind === 'circlek' ? 'CK' : far.name;
  return `${tag} ${d.toFixed(0)}m`;
}

function nearestNamed(
  x: number,
  z: number,
  points: readonly ChargePoint[],
): ChargePoint | null {
  let best: ChargePoint | null = null;
  let bestD = Infinity;
  for (const p of points) {
    if (p.kind === 'garage') {
      continue;
    }
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
