/**
 * Ownership: bike + rider kit GLBs and seat snap.
 * Talks via: a placed Group. Do not import combat/ or zombies/.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { loadHeroGltf } from './heroes';

export const KIT_BIKE_URL = '/models/kit-bike.glb';
export const KIT_RIDER_URL = '/models/kit-rider.glb';

function findSocket(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (!hit && obj.name === name) {
      hit = obj;
    }
  });
  return hit;
}

/**
 * Sit the rider hip on the bike seat. Bike +Y in Blender is nose.
 */
export function snapRiderToBike(bike: THREE.Object3D, rider: THREE.Object3D): void {
  const seat = findSocket(bike, 'socket-seat');
  const hip = rider;
  if (seat) {
    seat.add(hip);
    hip.position.set(0, 0, 0);
    return;
  }
  bike.add(hip);
  hip.position.set(0, 0.96, -0.22);
}

export async function loadKitRig(): Promise<THREE.Group | null> {
  const [bike, rider] = await Promise.all([
    loadHeroGltf(KIT_BIKE_URL),
    loadHeroGltf(KIT_RIDER_URL),
  ]);
  if (!bike) {
    return null;
  }
  const rig = new THREE.Group();
  rig.name = 'kit-rig';
  bike.name = 'kit-bike';
  rig.add(bike);
  if (rider) {
    rider.name = 'kit-rider';
    snapRiderToBike(bike, rider);
  }
  return rig;
}

export async function placeKit(
  parent: THREE.Object3D,
  at: { x: number; y?: number; z: number } = { x: 3.2, z: 6.5 },
): Promise<THREE.Group | null> {
  const rig = await loadKitRig();
  if (!rig) {
    return null;
  }
  rig.position.set(at.x, at.y ?? 0, at.z);
  parent.add(rig);
  return rig;
}
