/**
 * Ownership: canned hit readability (stop, knock, flash). No LLM.
 * Talks via: poses + timers. View reads the numbers; no meshes here.
 * Budget: keep this file under ~300 lines.
 */

export const FEEDBACK = {
  hitstop: 0.06,
  knockMelee: 3.4,
  knockRam: 7.2,
  flash: 0.2,
  squash: 0.28,
  impact: 0.22,
  ramShake: 0.24,
  ramLines: 0.32,
} as const;

export type XZ = { x: number; z: number };

export type HitImpulse = {
  vx: number;
  vz: number;
  flashT: number;
  squashT: number;
};

export function hitImpulse(
  from: XZ,
  to: XZ,
  kind: 'melee' | 'ram' | 'throw',
): HitImpulse {
  let dx = to.x - from.x;
  let dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) {
    dx = 0;
    dz = 1;
  } else {
    dx /= len;
    dz /= len;
  }
  const knock = kind === 'ram' ? FEEDBACK.knockRam : FEEDBACK.knockMelee;
  return {
    vx: dx * knock,
    vz: dz * knock,
    flashT: FEEDBACK.flash,
    squashT: FEEDBACK.squash,
  };
}

export function shakeOffset(
  remaining: number,
  seed: number,
): { x: number; y: number; z: number } {
  if (remaining <= 0) {
    return { x: 0, y: 0, z: 0 };
  }
  const s = remaining / FEEDBACK.ramShake;
  const a = Math.sin(seed * 37.1 + remaining * 90);
  const b = Math.cos(seed * 19.7 + remaining * 70);
  return { x: a * 0.38 * s, y: Math.abs(b) * 0.22 * s, z: b * 0.28 * s };
}
