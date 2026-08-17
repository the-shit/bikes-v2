/**
 * Ownership: thorn / shale patches as posed data for the tire loop.
 * Talks via: Hazard[]. bike/tires consumes these; no world internals.
 * Budget: keep this file under ~300 lines.
 */

import type { Hazard } from '../bike/tires';

export function seedThornHazards(
  along: readonly { x: number; z: number }[],
  count = 4,
): Hazard[] {
  const out: Hazard[] = [];
  if (!along.length) {
    return out;
  }
  const n = Math.min(count, along.length);
  for (let i = 0; i < n; i += 1) {
    const pt = along[Math.floor((i + 0.5) * (along.length / n))] ?? along[i];
    const side = i % 2 === 0 ? 1 : -1;
    out.push({
      x: pt.x + side * (2.2 + (i % 3) * 0.4),
      z: pt.z,
      r: 1.6 + (i % 3) * 0.25,
      severity: 0.7 + (i % 4) * 0.15,
    });
  }
  return out;
}
