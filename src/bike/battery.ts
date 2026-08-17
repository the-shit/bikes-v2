/**
 * Ownership: assist battery drain + charge apply.
 * Talks via: BatteryState. Charge points live in world/.
 * Budget: keep this file under ~300 lines.
 *
 * Drain numbers salvage v1 rideSystems.js (tuning only).
 */

export type AssistLevel = {
  id: number;
  name: string;
  power: number;
  drain: number;
};

export const ASSIST_LEVELS: readonly AssistLevel[] = Object.freeze([
  { id: 0, name: 'Off', power: 0.72, drain: 0 },
  { id: 1, name: 'Eco', power: 0.92, drain: 0.55 },
  { id: 2, name: 'Trail', power: 1.08, drain: 1 },
  { id: 3, name: 'Boost', power: 1.22, drain: 1.55 },
  { id: 4, name: 'Turbo', power: 1.38, drain: 2.25 },
]);

export const BATTERY_DEFAULTS = {
  drain: 0.016,
  regen: 0.004,
  startAssist: 2,
  dead: 0.01,
  low: 0.18,
} as const;

export type BatteryState = {
  charge: number;
  assist: number;
};

export type BatteryStep = {
  battery: BatteryState;
  toast: string;
};

export function createBattery(
  opts: Partial<BatteryState> = {},
): BatteryState {
  return {
    charge: clamp01(opts.charge ?? 1),
    assist: clampAssist(opts.assist ?? BATTERY_DEFAULTS.startAssist),
  };
}

export function clampAssist(level: number): number {
  const n = Math.round(Number(level) || 0);
  return Math.max(0, Math.min(ASSIST_LEVELS.length - 1, n));
}

export function assistInfo(level: number): AssistLevel {
  return ASSIST_LEVELS[clampAssist(level)] ?? ASSIST_LEVELS[2];
}

export function cycleAssist(state: BatteryState, delta: number): BatteryStep {
  const battery = {
    ...state,
    assist: clampAssist(state.assist + delta),
  };
  return {
    battery,
    toast: `Assist · ${assistInfo(battery.assist).name}`,
  };
}

export function stepBattery(
  state: BatteryState,
  throttle: number,
  dt: number,
): BatteryStep {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { battery: { ...state }, toast: '' };
  }
  let charge = clamp01(state.charge);
  const thr = clamp01(throttle);
  const gear = assistInfo(state.assist);
  const before = charge;
  if (thr > 0.05 && charge > 0 && gear.drain > 0) {
    charge = Math.max(0, charge - BATTERY_DEFAULTS.drain * thr * gear.drain * dt);
  } else if ((thr < 0.05 || gear.drain === 0) && charge < 1) {
    const regenMul = gear.drain === 0 ? 1.4 : 1;
    charge = Math.min(1, charge + BATTERY_DEFAULTS.regen * dt * regenMul);
  }
  let toast = '';
  if (charge <= BATTERY_DEFAULTS.dead && before > BATTERY_DEFAULTS.dead) {
    toast = 'Battery dead — legs only, champ';
  } else if (
    charge < BATTERY_DEFAULTS.low &&
    thr > 0.4 &&
    gear.drain > 0 &&
    before >= BATTERY_DEFAULTS.low
  ) {
    toast = "Battery's getting sleepy";
  }
  return {
    battery: { charge, assist: clampAssist(state.assist) },
    toast,
  };
}

/** Raise charge to at least `floor` (Circle K slushie juice). */
export function floorCharge(state: BatteryState, floor: number): BatteryState {
  return { ...state, charge: clamp01(Math.max(state.charge, floor)) };
}

/** Fill the pack (home garage). */
export function fillCharge(state: BatteryState, to = 1): BatteryState {
  return { ...state, charge: clamp01(Math.max(state.charge, to)) };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
