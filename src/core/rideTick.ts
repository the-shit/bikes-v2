/**
 * Ownership: per-tick bike systems — mount, battery, tires, charge.
 * Talks via: riders + world bikes. Session owns combat separately.
 * Budget: keep this file under ~300 lines.
 */

import { cycleAssist, stepBattery } from '../bike/battery';
import { drainScale } from '../bike/upgrades';
import { rideFeel } from '../bike/feel';
import {
  bikeForRider,
  nearestMountable,
  occupyBike,
  parkBike,
  replaceBike,
  type WorldBike,
} from '../bike/mount';
import { applyChargeProfile, profileFor } from '../bike/service';
import { repairTires, stepTires, type Hazard } from '../bike/tires';
import { idleIntent, type Intent } from '../input/intents';
import { nearCharge, type ChargePoint } from '../world/charge';
import { tryRampLaunch, type Ramp } from '../world/jumps';
import {
  stepRiderMotion,
  withToast,
  type Rider,
  type RiderId,
} from './rider';

export type RideWorld = {
  riders: Rider[];
  bikes: WorldBike[];
};

export function stepRideWorld(
  world: RideWorld,
  dt: number,
  intents: Readonly<Record<RiderId, Intent>>,
  heightAt: (x: number, z: number) => number,
  hazards: readonly Hazard[] = [],
  chargePoints: readonly ChargePoint[] = [],
  ramps: readonly Ramp[] = [],
): RideWorld {
  let bikes = world.bikes.map((b) => ({ ...b }));
  let riders = world.riders.map((rider) => {
    const intent = intents[rider.id] ?? idleIntent();
    const acted = applyEdges(rider, intent, bikes);
    bikes = acted.bikes;
    const mounted = acted.rider.mountedBikeId != null;
    const wb = mounted ? bikeForRider(bikes, acted.rider.id) : undefined;
    const feel = wb
      ? rideFeel(wb.tires.pressure, wb.battery.charge, wb.battery.assist)
      : undefined;
    let next = stepRiderMotion(acted.rider, intent, dt, heightAt, {
      feel,
      onFoot: !mounted,
    });
    if (wb) {
      const batt = stepBattery(
        wb.battery,
        intent.throttle,
        dt,
        drainScale(wb.upgrades),
      );
      const tires = stepTires(wb.tires, next.bike, dt, hazards);
      bikes = replaceBike(bikes, {
        ...wb,
        pose: next.bike,
        air: next.air,
        battery: batt.battery,
        tires: tires.tires,
      });
      const toast = tires.toast || batt.toast;
      if (toast) {
        next = withToast(next, toast);
      }
    }
    if (mounted && ramps.length) {
      const launched = tryRampLaunch(
        next.air,
        next.bike,
        ramps,
        heightAt(next.bike.x, next.bike.z),
      );
      if (launched) {
        next = withToast(
          {
            ...next,
            air: launched.air,
            bike: { ...next.bike, y: launched.y, speed: launched.speed },
          },
          launched.toast,
        );
      }
    }
    return next;
  });

  const chargeToasts = new Map<RiderId, string>();
  bikes = bikes.map((bike) => {
    const point = nearCharge(bike.pose.x, bike.pose.z, chargePoints);
    if (!point) {
      return bike;
    }
    const served = applyChargeProfile(bike, profileFor(point.kind));
    if (!served.changed) {
      return bike;
    }
    if (served.toast && served.bike.occupantId != null) {
      chargeToasts.set(served.bike.occupantId, served.toast);
    }
    return served.bike;
  });
  if (chargeToasts.size > 0) {
    riders = riders.map((r) => {
      const toast = chargeToasts.get(r.id);
      return toast ? withToast(r, toast) : r;
    });
  }

  return { riders, bikes };
}

function applyEdges(
  rider: Rider,
  intent: Intent,
  bikes: WorldBike[],
): { rider: Rider; bikes: WorldBike[] } {
  let next = rider;
  let list = bikes;
  const mountEdge = intent.mount && !rider.prevMount;
  const repairEdge = intent.repair && !rider.prevRepair;
  const assistDelta =
    (intent.assistUp && !rider.prevAssistUp ? 1 : 0) +
    (intent.assistDown && !rider.prevAssistDown ? -1 : 0);

  if (mountEdge) {
    const hopped = tryMount(next, list);
    next = hopped.rider;
    list = hopped.bikes;
  }

  const bike = bikeForRider(list, next.id);
  if (bike && assistDelta !== 0) {
    const cycled = cycleAssist(bike.battery, assistDelta);
    list = replaceBike(list, { ...bike, battery: cycled.battery });
    next = withToast(next, cycled.toast);
  }

  const live = bikeForRider(list, next.id);
  if (live && repairEdge) {
    const fix = repairTires(live.tires, live.pose.speed);
    list = replaceBike(list, { ...live, tires: fix.tires });
    next = withToast(next, fix.toast);
  }

  return { rider: next, bikes: list };
}

function tryMount(
  rider: Rider,
  bikes: WorldBike[],
): { rider: Rider; bikes: WorldBike[] } {
  const current = bikeForRider(bikes, rider.id);
  if (current) {
    return {
      rider: withToast(
        {
          ...rider,
          mountedBikeId: null,
          bike: { ...rider.bike, speed: 0, lean: 0 },
        },
        'Hopped off — bike stays put',
      ),
      bikes: replaceBike(bikes, parkBike(current, rider.bike)),
    };
  }
  const near = nearestMountable(rider.bike.x, rider.bike.z, bikes);
  if (!near) {
    const gone =
      rider.lastBikeId != null &&
      bikes.some((b) => b.id === rider.lastBikeId && b.occupantId != null);
    return {
      rider: withToast(
        rider,
        gone ? 'Someone yoinked it' : 'No bike in reach',
      ),
      bikes,
    };
  }
  return {
    rider: withToast(
      {
        ...rider,
        mountedBikeId: near.id,
        lastBikeId: near.id,
        bike: { ...near.pose },
        air: near.air,
      },
      'Back in the saddle',
    ),
    bikes: replaceBike(bikes, occupyBike(near, rider.id)),
  };
}
