/**
 * Ownership: combine tire + battery into physics scales.
 * Talks via: RideFeel. Does not step motion.
 * Budget: keep this file under ~300 lines.
 *
 * Trail + full pack = identity so M1 ride feel stays sacred.
 */

import { assistInfo, ASSIST_LEVELS } from './battery';
import { pressureModifiers } from './tires';

export type RideFeel = {
  maxSpeedScale: number;
  accelScale: number;
  dragScale: number;
  rollingScale: number;
  turnScale: number;
  brakeScale: number;
};

export const IDENTITY_FEEL: RideFeel = {
  maxSpeedScale: 1,
  accelScale: 1,
  dragScale: 1,
  rollingScale: 1,
  turnScale: 1,
  brakeScale: 1,
};

const TRAIL_POWER = ASSIST_LEVELS[2].power;
const OFF_POWER = ASSIST_LEVELS[0].power;
const DEAD = 0.01;

export function rideFeel(
  pressure: number,
  charge: number,
  assist: number,
): RideFeel {
  const tires = pressureModifiers(pressure);
  const motor =
    charge > DEAD
      ? assistInfo(assist).power / TRAIL_POWER
      : OFF_POWER / TRAIL_POWER;
  return {
    maxSpeedScale: tires.maxSpeedScale * (0.9 + 0.1 * Math.min(1, motor)),
    accelScale: tires.accelScale * motor,
    dragScale: tires.dragScale,
    rollingScale: tires.rollingScale,
    turnScale: tires.turnScale,
    brakeScale: tires.brakeScale,
  };
}
