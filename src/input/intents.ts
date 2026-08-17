/**
 * Ownership: semantic player intents. Adapters map devices onto this shape.
 * Talks via: Intent values. Gameplay must not read KeyboardEvent directly.
 * Budget: keep this file under ~300 lines.
 */

export type Intent = {
  throttle: number;
  steer: number;
  brake: number;
  lookX: number;
  lookY: number;
  fire: boolean;
  melee: boolean;
  hop: boolean;
  lock: boolean;
  mount: boolean;
  repair: boolean;
  assistUp: boolean;
  assistDown: boolean;
  use: boolean;
};

export function idleIntent(): Intent {
  return {
    throttle: 0,
    steer: 0,
    brake: 0,
    lookX: 0,
    lookY: 0,
    fire: false,
    melee: false,
    hop: false,
    lock: false,
    mount: false,
    repair: false,
    assistUp: false,
    assistDown: false,
    use: false,
  };
}

export function clampAxis(value: number): number {
  if (value > 1) {
    return 1;
  }
  if (value < -1) {
    return -1;
  }
  return value;
}
