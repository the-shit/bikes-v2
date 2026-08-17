/**
 * Ownership: apply a charge-point profile to a world bike.
 * Talks via: ChargeProfile in, WorldBike out. Geospatial range lives in world/.
 * Budget: keep this file under ~300 lines.
 */

import { fillCharge, floorCharge } from './battery';
import type { WorldBike } from './mount';
import { floorPressure, restockKits, TIRE_DEFAULTS } from './tires';

export type ChargeProfile = {
  mode: 'fill' | 'floor';
  fillTo: number;
  airTo: number;
  restockTubes: number;
  restockPatches: number;
  toast: string;
};

export const GARAGE_PROFILE: ChargeProfile = {
  mode: 'fill',
  fillTo: 1,
  airTo: 1,
  restockTubes: TIRE_DEFAULTS.startTubes,
  restockPatches: TIRE_DEFAULTS.startPatches,
  toast: "Home garage — pack's purring",
};

export const CIRCLE_K_PROFILE: ChargeProfile = {
  mode: 'floor',
  fillTo: 0.55,
  airTo: 0.85,
  restockTubes: TIRE_DEFAULTS.startTubes,
  restockPatches: TIRE_DEFAULTS.startPatches,
  toast: 'Circle K — slushie charge',
};

export function profileFor(kind: 'garage' | 'circlek'): ChargeProfile {
  return kind === 'circlek' ? CIRCLE_K_PROFILE : GARAGE_PROFILE;
}

export function applyChargeProfile(
  bike: WorldBike,
  profile: ChargeProfile,
): { bike: WorldBike; toast: string; changed: boolean } {
  const battery =
    profile.mode === 'fill'
      ? fillCharge(bike.battery, profile.fillTo)
      : floorCharge(bike.battery, profile.fillTo);
  let tires = restockKits(
    bike.tires,
    profile.restockTubes,
    profile.restockPatches,
  );
  tires = floorPressure(tires, profile.airTo);
  const changed =
    battery.charge > bike.battery.charge + 1e-6 ||
    tires.tubes > bike.tires.tubes ||
    tires.patches > bike.tires.patches ||
    tires.pressure > bike.tires.pressure + 1e-6 ||
    (bike.tires.flat && !tires.flat);
  return {
    bike: { ...bike, battery, tires },
    toast: changed ? profile.toast : '',
    changed,
  };
}
