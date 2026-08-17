/**
 * Ownership: play HUD + weapon telegraph + pack readouts.
 * Talks via: read-only snapshots. Feedback widget stays in ui/feedback.ts.
 * Budget: keep this file under ~300 lines.
 */

import { assistInfo } from '../bike/battery';
import type { WorldBike } from '../bike/mount';
import { swingArc } from '../combat/melee';
import type { RiderId } from '../core/rider';
import type { SessionSnapshot } from '../core/session';
import { chargeHint, type ChargePoint } from '../world/charge';

export type Hud = {
  update(snap: SessionSnapshot, riderId: RiderId, fps: number): void;
};

export function createHud(
  el: HTMLElement,
  chargePoints: readonly ChargePoint[] = [],
): Hud {
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
    <div class="lock-banner" data-lock hidden>LOCKED! ★</div>
    <div class="lock-hint">F note · R remount · Q lock-on</div>
  `;
  const weapon = el.querySelector('[data-weapon]') as HTMLElement;
  const wepState = el.querySelector('[data-wep-state]') as HTMLElement;
  const ride = el.querySelector('[data-ride]') as HTMLElement;
  const lockBanner = el.querySelector('[data-lock]') as HTMLElement;

  return {
    update(snap, riderId, fps) {
      const rider = snap.riders.find((r) => r.id === riderId);
      if (!rider) {
        ride.textContent = 'no rider';
        return;
      }
      const swing = swingArc(rider.melee);
      const pack = bikeForHud(snap.bikes, rider.mountedBikeId, rider.lastBikeId);
      const kmh = Math.abs(rider.bike.speed) * 3.6;
      const live = snap.zombies.filter((z) => !z.dead).length;
      const air = rider.air.airborne ? 'air' : '';
      const mounted = rider.mountedBikeId != null;
      const psi = pack ? Math.round(pack.tires.pressure * 100) : 0;
      const batt = pack ? Math.round(pack.battery.charge * 100) : 0;
      const assist = pack ? assistInfo(pack.battery.assist).name : '';
      const kits = pack
        ? `${pack.tires.tubes}◎ ${pack.tires.patches}▣`
        : '';
      const hx = mounted ? rider.bike.x : (pack?.pose.x ?? rider.bike.x);
      const hz = mounted ? rider.bike.z : (pack?.pose.z ?? rider.bike.z);
      const where = chargeHint(hx, hz, chargePoints);
      const bits = [
        mounted ? `${kmh.toFixed(0)} km/h` : 'ON FOOT',
        assist,
        pack ? `batt ${batt}%` : '',
        pack ? (pack.tires.flat ? 'FLAT' : `psi ${psi}`) : '',
        kits,
        where,
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
      const locked = rider.lock.targetId != null;
      lockBanner.hidden = !locked;
      lockBanner.dataset.flair = rider.lock.flairT > 0 ? '1' : '0';
      lockBanner.textContent = rider.lock.flairT > 0.4 ? 'LOCKED! ★' : 'locked on';
    },
  };
}

function bikeForHud(
  bikes: readonly WorldBike[],
  mountedId: number | null,
  lastId: number | null,
): WorldBike | undefined {
  if (mountedId != null) {
    return bikes.find((b) => b.id === mountedId);
  }
  if (lastId != null) {
    return bikes.find((b) => b.id === lastId);
  }
  return undefined;
}
