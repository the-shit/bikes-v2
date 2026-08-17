/**
 * Ownership: play HUD (speed, melee, shamblers, toast).
 * Talks via: read-only snapshots. One HUD per local rider.
 * Budget: keep this file under ~300 lines.
 */

import type { SessionSnapshot } from '../core/session';
import type { RiderId } from '../core/rider';

export type Hud = {
  update(snap: SessionSnapshot, riderId: RiderId, fps: number): void;
};

export function createHud(el: HTMLElement): Hud {
  return {
    update(snap, riderId, fps) {
      const rider = snap.riders.find((r) => r.id === riderId);
      if (!rider) {
        el.textContent = 'no rider';
        return;
      }
      const kmh = Math.abs(rider.bike.speed) * 3.6;
      const live = snap.zombies.filter((z) => !z.dead).length;
      const phase = rider.melee.phase === 'idle' ? '' : rider.melee.phase;
      const air = rider.air.airborne ? 'air' : '';
      const bits = [
        `${kmh.toFixed(0)} km/h`,
        `${live} shambler${live === 1 ? '' : 's'}`,
        rider.kills ? `${rider.kills} bonked` : '',
        phase,
        air,
        fps > 0 ? `${fps.toFixed(0)} fps` : '',
      ].filter(Boolean);
      const toast = rider.toast ? `\n${rider.toast}` : '';
      el.textContent = `WASD ride · Space brake · Shift hop · E melee\n${bits.join(' · ')}${toast}`;
    },
  };
}
