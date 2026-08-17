/**
 * Ownership: authored hero GLBs (7620, later CK). Not fill ranches.
 * Talks via: a placed Object3D. Do not import bike/ or combat/.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const RANCH_URL = '/models/ranch-7620.glb';

/** Street-facing ranch after Blender +Y front → glTF −Z. */
export const RANCH_YAW = Math.PI;

const loader = new GLTFLoader();

function dress(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!('isMesh' in obj) || !(obj as THREE.Mesh).isMesh) {
      return;
    }
    const mesh = obj as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m) {
        m.side = THREE.DoubleSide;
      }
    }
  });
}

export function loadHeroGltf(url: string): Promise<THREE.Group | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        dress(root);
        resolve(root);
      },
      undefined,
      () => resolve(null),
    );
  });
}

export type HeroPose = {
  x: number;
  z: number;
  y?: number;
  yaw?: number;
};

/**
 * Sit 7620 on the home pin (M1 Jan slice). Pose omitted → origin.
 */
export async function placeHeroes(
  parent: THREE.Object3D,
  pose?: HeroPose,
): Promise<THREE.Object3D | null> {
  const ranch = await loadHeroGltf(RANCH_URL);
  if (!ranch) {
    return null;
  }
  ranch.name = 'ranch-7620';
  if (pose) {
    ranch.position.set(pose.x, pose.y ?? 0, pose.z);
    ranch.rotation.y = (pose.yaw ?? 0) + RANCH_YAW;
  } else {
    ranch.rotation.y = RANCH_YAW;
  }
  parent.add(ranch);
  return ranch;
}
