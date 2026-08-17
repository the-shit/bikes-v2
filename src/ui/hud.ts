/**
 * Ownership: play HUD (speed, melee, shamblers, toast).
 * Talks via: read-only snapshots. Feedback widget is ui/feedback.ts (todo 520).
 * Budget: keep this file under ~300 lines.
 */

import type { SessionSnapshot } from '../core/session';

export type Hud = {
  update(snap: SessionSnapshot, fps: number): void;
};

export function createHud(el: HTMLElement): Hud {
  return {
    update(snap, fps) {
      const kmh = Math.abs(snap.bike.speed) * 3.6;
      const live = snap.zombies.filter((z) => !z.dead).length;
      const phase = snap.melee.phase === 'idle' ? '' : snap.melee.phase;
      const air = snap.air.airborne ? 'air' : '';
      const bits = [
        `${kmh.toFixed(0)} km/h`,
        `${live} shambler${live === 1 ? '' : 's'}`,
        snap.kills ? `${snap.kills} down` : '',
        phase,
        air,
        fps > 0 ? `${fps.toFixed(0)} fps` : '',
      ].filter(Boolean);
      const toast = snap.toast ? `\n${snap.toast}` : '';
      el.textContent = `WASD ride · Space brake · Shift hop · E melee\n${bits.join(' · ')}${toast}`;
    },
  };
}
