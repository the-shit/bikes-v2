/**
 * Ownership: static Mesa dressing (hood lots, ramps, loot, chokes, landmarks).
 * Talks via: MesaPlay. View adds the group; no sim here.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import type { CuratedSpot } from './curation';
import type { Ramp } from './jumps';
import type { LandmarkPin } from './landmarks';
import type { MesaPlay } from './mesa';
import { buildPalm, buildRanch } from './props';
import {
  buildChokeCone,
  buildCostco,
  buildFlipCrate,
  buildLootFlag,
  buildRamp,
  buildSpringsSign,
} from './setpieces';

export type DressGroup = {
  root: THREE.Group;
  post: THREE.Group;
};

export function dressMesa(play: MesaPlay): DressGroup {
  const root = new THREE.Group();
  root.name = 'mesa-dress';
  const heightAt = (x: number, z: number) => play.terrain.sampleHeight(x, z);

  for (const lot of play.hoodLots) {
    root.add(buildRanch(lot.x, lot.z, lot.yaw, heightAt));
    if ((lot.x + lot.z) % 3 < 1.2) {
      root.add(buildPalm(lot.palm.x, lot.palm.z, heightAt));
    }
  }
  for (const ramp of play.ramps) {
    root.add(buildRamp(ramp, heightAt(ramp.x, ramp.z)));
  }
  for (const spot of play.spots) {
    const y = heightAt(spot.x, spot.z);
    if (spot.kind === 'loot') {
      const flag = buildLootFlag(spot, y);
      flag.name = `loot-flag-${spot.id}`;
      root.add(flag);
    }
    if (spot.kind === 'choke') {
      root.add(buildChokeCone(spot, y));
    }
  }
  for (const lm of play.landmarks) {
    addLandmark(root, lm, heightAt(lm.x, lm.z));
  }

  const post = new THREE.Group();
  post.name = 'post-flip';
  post.visible = false;
  for (const spot of play.spots) {
    if (spot.kind !== 'loot' && spot.kind !== 'choke') {
      continue;
    }
    post.add(
      buildFlipCrate(spot.x + 2.2, spot.z - 1.4, heightAt(spot.x, spot.z)),
    );
  }
  root.add(post);
  return { root, post };
}

function addLandmark(
  root: THREE.Group,
  lm: LandmarkPin,
  y: number,
): void {
  if (lm.style === 'circlek') {
    return;
  }
  if (lm.style === 'costco') {
    root.add(buildCostco(lm.x, lm.z, y));
    return;
  }
  root.add(buildSpringsSign(lm.x, lm.z, y, lm.name));
}

export function markPostFlip(post: THREE.Group, on: boolean): void {
  post.visible = on;
}

export function spotAt(
  spots: readonly CuratedSpot[],
  kind: CuratedSpot['kind'],
): CuratedSpot | undefined {
  return spots.find((s) => s.kind === kind);
}

export function rampAt(ramps: readonly Ramp[], id: string): Ramp | undefined {
  return ramps.find((r) => r.id === id);
}
