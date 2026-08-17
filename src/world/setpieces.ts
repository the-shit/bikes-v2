/**
 * Ownership: curated setpiece primitives (ramps, loot, landmarks).
 * Talks via: meshes. View/dress add these; not hero art.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';

export function buildRamp(
  ramp: { x: number; z: number; yaw: number; width: number; length: number; height: number },
  y: number,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(ramp.x, y, ramp.z);
  root.rotation.y = ramp.yaw;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(ramp.width, 0.18, ramp.length),
    new THREE.MeshStandardMaterial({ color: 0xf2d04b, roughness: 0.55 }),
  );
  deck.rotation.x = -Math.atan2(ramp.height, ramp.length);
  deck.position.set(0, ramp.height * 0.5, 0);
  root.add(deck);
  return root;
}

export function buildLootFlag(
  spot: { x: number; z: number },
  y: number,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(spot.x, y, spot.z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a7050 }),
  );
  pole.position.y = 1.2;
  root.add(pole);
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xc46bff, roughness: 0.45 }),
  );
  flag.position.set(0.5, 2.05, 0);
  root.add(flag);
  return root;
}

export function buildChokeCone(
  spot: { x: number; z: number },
  y: number,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(spot.x, y, spot.z);
  for (const ox of [-1.6, 1.6]) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0xff7a18, roughness: 0.5 }),
    );
    cone.position.set(ox, 0.42, 0);
    root.add(cone);
  }
  return root;
}

export function buildCostco(x: number, z: number, y: number): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(52, 8.5, 34),
    new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.82 }),
  );
  body.position.y = 4.25;
  root.add(body);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(52.2, 1.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.45 }),
  );
  band.position.set(0, 7.4, 17.1);
  root.add(band);
  return root;
}

export function buildSpringsSign(
  x: number,
  z: number,
  y: number,
  _name: string,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 5.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x889098 }),
  );
  pole.position.y = 2.6;
  root.add(pole);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 1.6, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.55 }),
  );
  board.position.y = 4.6;
  root.add(board);
  return root;
}

export function buildFlipCrate(x: number, z: number, y: number): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xc48a3a, roughness: 0.75 }),
  );
  box.position.y = 0.55;
  box.rotation.y = 0.3;
  root.add(box);
  return root;
}
