/**
 * Ownership: play HUD + weapon telegraph. One HUD per local rider.
 * Talks via: read-only snapshots. Feedback widget stays in ui/feedback.ts.
 * Budget: keep this file under ~300 lines.
 */

import { swingArc } from '../combat/melee';
import type { RiderId } from '../core/rider';
import type { SessionSnapshot } from '../core/session';

export type Hud = {
  update(snap: SessionSnapshot, riderId: RiderId, fps: number): void;
};

export function createHud(el: HTMLElement): Hud {
  el.innerHTML = `
    <div class="weapon" data-weapon>
      <div class="bat-glyph" aria-hidden="true"></div>
      <div class="weapon-meta">
        <span class="key">E</span>
        <span class="wep-name">BAT</span>
        <span class="wep-state" data-wep-state>ready</span>
      </div>
    </div>
    <div class="ride-line" data-ride></div>
  `;
  const weapon = el.querySelector('[data-weapon]') as HTMLElement;
  const wepState = el.querySelector('[data-wep-state]') as HTMLElement;
  const ride = el.querySelector('[data-ride]') as HTMLElement;

  return {
    update(snap, riderId, fps) {
      const rider = snap.riders.find((r) => r.id === riderId);
      if (!rider) {
        ride.textContent = 'no rider';
        return;
      }
      const swing = swingArc(rider.melee);
      const kmh = Math.abs(rider.bike.speed) * 3.6;
      const live = snap.zombies.filter((z) => !z.dead).length;
      const air = rider.air.airborne ? 'air' : '';
      const bits = [
        `${kmh.toFixed(0)} km/h`,
        `${live} shambler${live === 1 ? '' : 's'}`,
        rider.kills ? `${rider.kills} bonked` : '',
        air,
        fps > 0 ? `${fps.toFixed(0)} fps` : '',
      ].filter(Boolean);
      const toast = rider.toast ? `  ${rider.toast}` : '';
      ride.textContent = `${bits.join(' · ')}${toast}`;

      let state = 'ready';
      if (rider.melee.phase === 'windup') {
        state = 'wind-up';
      } else if (rider.melee.phase === 'active') {
        state = 'SWING';
      } else if (rider.melee.phase === 'recover') {
        state = 'recover';
      }
      wepState.textContent = state;
      weapon.dataset.ready = swing.ready ? '1' : '0';
      weapon.dataset.swing = swing.swinging ? '1' : '0';
      weapon.dataset.hit = rider.impactFlashT > 0 ? '1' : '0';
    },
  };
}
