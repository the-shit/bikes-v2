/**
 * Ownership: bike momentum, lean, traction.
 * Talks via: events/state. Do not import combat/ or zombies/ internals.
 * Budget: keep this file under ~300 lines.
 */

export type BikeState = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
};

/** Stub feel table. M1 evaluates v1 rideSystems before filling real numbers. */
export const BIKE_DEFAULTS = {
  maxSpeed: 0,
  accel: 0,
  brake: 0,
  turnRate: 0,
} as const;

export function createBikeState(): BikeState {
  return { x: 0, y: 0, z: 0, yaw: 0, speed: 0 };
}

/** Stub. M1 owns ride feel. */
export function stepBike(state: BikeState, _dt: number): BikeState {
  return state;
}
