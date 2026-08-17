/**
 * Ownership: ride snapshot shape + event collect for the widget.
 * Talks via: EventBus topics feedback:snapshot*. Do not import bike/world.
 * Budget: keep this file under ~300 lines.
 */

import type { EventBus } from '../core/events';
import { currentBuildId } from '../buildInfo';

export type RidePosition = {
  x: number;
  y: number;
  z: number;
};

export type RideSnapshot = {
  position: RidePosition | null;
  speed: number | null;
  street: string | null;
  lat: number | null;
  lon: number | null;
  pressure: number | null;
  buildId: string;
  at: string;
};

export function emptySnapshot(now = () => new Date().toISOString()): RideSnapshot {
  return {
    position: null,
    speed: null,
    street: null,
    lat: null,
    lon: null,
    pressure: null,
    buildId: currentBuildId(),
    at: now(),
  };
}

export function formatSnapshotLine(snap: RideSnapshot): string {
  const bits: string[] = [];
  if (snap.street) {
    bits.push(snap.street);
  }
  if (snap.speed != null) {
    bits.push(`${Math.round(snap.speed * 3.6)} km/h`);
  }
  if (snap.lat != null && snap.lon != null) {
    bits.push(`${snap.lat.toFixed(5)}, ${snap.lon.toFixed(5)}`);
  } else if (snap.position) {
    bits.push(
      `xyz ${snap.position.x.toFixed(1)}, ${snap.position.y.toFixed(1)}, ${snap.position.z.toFixed(1)}`,
    );
  }
  if (snap.pressure != null) {
    bits.push(`tires ${Math.round(snap.pressure * 100)}%`);
  }
  bits.push(snap.buildId);
  return bits.join(' · ');
}

export function collectSnapshot(
  bus: EventBus,
  timeoutMs = 80,
): Promise<RideSnapshot> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve(emptySnapshot());
    }, timeoutMs);
    const off = bus.on<RideSnapshot>('feedback:snapshot', (snap) => {
      clearTimeout(timer);
      off();
      resolve(snap);
    });
    bus.emit('feedback:snapshot-request', null);
  });
}

export function bindFeedbackSnapshot(
  bus: EventBus,
  getSnapshot: () => RideSnapshot,
): () => void {
  return bus.on('feedback:snapshot-request', () => {
    bus.emit('feedback:snapshot', getSnapshot());
  });
}
