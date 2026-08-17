/**
 * Ownership: tire pressure, flats, tubes/patches.
 * Talks via: TireState. Hazards are posed data from world/.
 * Budget: keep this file under ~300 lines.
 *
 * Feel constants salvage v1 rideSystems.js (tuning only).
 */

export type Hazard = {
  x: number;
  z: number;
  r: number;
  severity: number;
};

export type TireState = {
  pressure: number;
  flat: boolean;
  tubes: number;
  patches: number;
};

export type TireStep = {
  tires: TireState;
  toast: string;
};

export const TIRE_DEFAULTS = {
  hazardDrain: 0.55,
  hazardRefSpeed: 14,
  softLeakBelow: 0.42,
  softLeakRate: 0.012,
  patchRestore: 0.38,
  tubeRestore: 1,
  repairMaxSpeed: 1.15,
  startTubes: 1,
  startPatches: 2,
} as const;

export function createTires(opts: Partial<TireState> = {}): TireState {
  const pressure = clamp01(opts.pressure ?? 1);
  return {
    pressure,
    flat: opts.flat ?? pressure <= 0.001,
    tubes: Math.max(0, Math.round(opts.tubes ?? TIRE_DEFAULTS.startTubes)),
    patches: Math.max(0, Math.round(opts.patches ?? TIRE_DEFAULTS.startPatches)),
  };
}

export function pressureModifiers(pressure: number): {
  maxSpeedScale: number;
  accelScale: number;
  dragScale: number;
  rollingScale: number;
  turnScale: number;
  brakeScale: number;
} {
  const p = clamp01(pressure);
  return {
    maxSpeedScale: 0.18 + 0.82 * p,
    accelScale: 0.28 + 0.72 * p,
    dragScale: 1 + (1 - p) * 2.1,
    rollingScale: 1 + (1 - p) * 2.8,
    turnScale: 0.4 + 0.6 * p,
    brakeScale: 0.55 + 0.45 * p,
  };
}

export function hazardsAt(
  x: number,
  z: number,
  hazards: readonly Hazard[],
): Hazard[] {
  return hazards.filter((h) => Math.hypot(x - h.x, z - h.z) <= h.r);
}

export function stepTires(
  state: TireState,
  bike: { x: number; z: number; speed: number },
  dt: number,
  hazards: readonly Hazard[] = [],
): TireStep {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { tires: { ...state }, toast: '' };
  }
  let pressure = clamp01(state.pressure);
  let flat = pressure <= 0.001;
  let toast = '';

  if (!flat && bike.speed > 0.5) {
    for (const h of hazardsAt(bike.x, bike.z, hazards)) {
      const speedFactor = Math.min(2.2, bike.speed / TIRE_DEFAULTS.hazardRefSpeed);
      pressure = Math.max(
        0,
        pressure - TIRE_DEFAULTS.hazardDrain * (h.severity ?? 1) * speedFactor * dt,
      );
      if (pressure <= 0.001) {
        pressure = 0;
        flat = true;
        toast = 'FLAT — crawl or punch R';
      } else if (pressure < 0.35 && !toast) {
        toast = 'Tire going squish…';
      }
    }
  }

  if (!flat && pressure < TIRE_DEFAULTS.softLeakBelow && bike.speed > 1) {
    pressure = Math.max(0, pressure - TIRE_DEFAULTS.softLeakRate * dt);
    if (pressure <= 0.001) {
      pressure = 0;
      flat = true;
      toast = 'FLAT — tube or patch (R)';
    }
  }

  if (pressure <= 0.001) {
    flat = true;
    pressure = 0;
  } else {
    flat = false;
  }

  return { tires: { ...state, pressure, flat }, toast };
}

export function usePatch(state: TireState, speed: number): TireStep {
  if (state.patches <= 0) {
    return { tires: state, toast: 'No patches left' };
  }
  if (Math.abs(speed) > TIRE_DEFAULTS.repairMaxSpeed) {
    return { tires: state, toast: 'Slow down to patch' };
  }
  if (state.pressure >= 0.98) {
    return { tires: state, toast: 'Tire already plump' };
  }
  const pressure = Math.min(1, state.pressure + TIRE_DEFAULTS.patchRestore);
  return {
    tires: {
      ...state,
      patches: state.patches - 1,
      pressure,
      flat: pressure <= 0.001,
    },
    toast: pressure >= 0.99 ? 'Patched — full enough' : "Patch job — don't get cocky",
  };
}

export function useTube(state: TireState, speed: number): TireStep {
  if (state.tubes <= 0) {
    return { tires: state, toast: 'No spare tubes' };
  }
  if (Math.abs(speed) > TIRE_DEFAULTS.repairMaxSpeed) {
    return { tires: state, toast: 'Stop to change the tube' };
  }
  return {
    tires: {
      ...state,
      tubes: state.tubes - 1,
      pressure: TIRE_DEFAULTS.tubeRestore,
      flat: false,
    },
    toast: 'Fresh tube — round again',
  };
}

/** Tube if flat / critically low, else patch. */
export function repairTires(state: TireState, speed: number): TireStep {
  if (state.flat || state.pressure < 0.12) {
    if (state.tubes > 0) {
      return useTube(state, speed);
    }
    if (state.patches > 0) {
      return usePatch(state, speed);
    }
    return { tires: state, toast: 'No tubes or patches' };
  }
  if (state.pressure < 0.92) {
    if (state.patches > 0) {
      return usePatch(state, speed);
    }
    if (state.tubes > 0) {
      return useTube(state, speed);
    }
    return { tires: state, toast: 'No repair kits' };
  }
  return { tires: state, toast: 'Tire is fine' };
}

export function restockKits(
  state: TireState,
  tubes: number,
  patches: number,
): TireState {
  return {
    ...state,
    tubes: Math.max(state.tubes, tubes),
    patches: Math.max(state.patches, patches),
  };
}

export function floorPressure(state: TireState, airTo: number): TireState {
  const pressure = clamp01(Math.max(state.pressure, airTo));
  return { ...state, pressure, flat: pressure <= 0.001 };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
