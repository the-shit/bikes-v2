/**
 * Ownership: merge device intents into one ride Intent.
 * Talks via: Intent. Strongest axis wins; buttons OR.
 * Budget: keep this file under ~300 lines.
 */

import { clampAxis, idleIntent, type Intent } from './intents';

export function combineIntents(...parts: readonly Intent[]): Intent {
  const out = idleIntent();
  for (const p of parts) {
    out.throttle = stronger01(out.throttle, p.throttle);
    out.brake = stronger01(out.brake, p.brake);
    out.steer = strongerAxis(out.steer, p.steer);
    out.lookX = strongerAxis(out.lookX, p.lookX);
    out.lookY = strongerAxis(out.lookY, p.lookY);
    out.fire = out.fire || p.fire;
    out.melee = out.melee || p.melee;
    out.hop = out.hop || p.hop;
    out.lock = out.lock || p.lock;
    out.mount = out.mount || p.mount;
    out.repair = out.repair || p.repair;
    out.assistUp = out.assistUp || p.assistUp;
    out.assistDown = out.assistDown || p.assistDown;
    out.use = out.use || p.use;
  }
  return out;
}

function stronger01(a: number, b: number): number {
  return Math.max(0, Math.min(1, Math.max(a, b)));
}

function strongerAxis(a: number, b: number): number {
  return Math.abs(a) >= Math.abs(b) ? clampAxis(a) : clampAxis(b);
}
