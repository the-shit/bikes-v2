/**
 * Ownership: M1 placeholder primitives (not hero art).
 * Real meshes land via GitHub issues labeled `assets`. Do not block.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import type { JanSlice } from './slice';

const SIDING = 0xf1ede2;
const SHINGLE = 0x9a8a72;
const CONCRETE = 0xcfc9bd;
const PALM = 0x3f6b35;
const TRUNK = 0x9a8264;

export function buildHome(slice: JanSlice): THREE.Group {
  const root = new THREE.Group();
  root.position.set(
    slice.home.x,
    slice.terrain.sampleHeight(slice.home.x, slice.home.z),
    slice.home.z,
  );
  root.rotation.y = slice.home.faceYaw;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(12, 2.8, 9),
    new THREE.MeshStandardMaterial({ color: SIDING, roughness: 0.85 }),
  );
  body.position.set(0.8, 1.4, 0);
  root.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: SHINGLE, roughness: 0.95 }),
  );
  roof.position.set(0.8, 2.9, 0);
  root.add(roof);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.08, 9),
    new THREE.MeshStandardMaterial({ color: CONCRETE, roughness: 0.9 }),
  );
  slab.position.set(-6.2, 0.04, 1.2);
  root.add(slab);
  const carport = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.12, 9),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 }),
  );
  carport.position.set(-6.2, 2.75, 1.2);
  root.add(carport);
  return root;
}

export function buildRanch(
  x: number,
  z: number,
  yaw: number,
  heightAt: (x: number, z: number) => number,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, heightAt(x, z), z);
  root.rotation.y = yaw;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(11, 2.6, 7.2),
    new THREE.MeshStandardMaterial({ color: SIDING, roughness: 0.88 }),
  );
  body.position.y = 1.3;
  root.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 0.2, 7.8),
    new THREE.MeshStandardMaterial({ color: SHINGLE, roughness: 0.95 }),
  );
  roof.position.y = 2.7;
  root.add(roof);
  return root;
}

export function buildPalm(
  x: number,
  z: number,
  heightAt: (x: number, z: number) => number,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, heightAt(x, z), z);
  const h = 7;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, h, 6),
    new THREE.MeshStandardMaterial({ color: TRUNK, roughness: 0.92 }),
  );
  trunk.position.y = h / 2;
  root.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 8, 6),
    new THREE.MeshStandardMaterial({ color: PALM, roughness: 0.8 }),
  );
  crown.position.y = h + 0.2;
  crown.scale.set(1.5, 0.5, 1.5);
  root.add(crown);
  return root;
}

export function buildBike(withRider = true): THREE.Group {
  const root = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.55, 1.7),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45 }),
  );
  frame.position.y = 0.7;
  root.add(frame);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222228 });
  for (const oz of [-0.65, 0.65]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12),
      wheelMat,
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(0, 0.32, oz);
    root.add(w);
  }
  if (withRider) {
    root.add(buildWalkerMesh());
  }
  return root;
}

export function buildWalker(): THREE.Group {
  const root = new THREE.Group();
  root.add(buildWalkerMesh());
  return root;
}

function buildWalkerMesh(): THREE.Mesh {
  const rider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.7 }),
  );
  rider.position.set(0, 1.25, 0);
  rider.name = 'rider';
  return rider;
}

export function buildSandPad(
  x: number,
  z: number,
  y: number,
  size = 70,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(size, 24),
    new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.94 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y - 0.04, z);
  return mesh;
}

export function buildCircleK(x: number, z: number, y: number): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(18, 5.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.7 }),
  );
  body.position.y = 2.6;
  root.add(body);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.55 }),
  );
  canopy.position.set(0, 4.1, 12);
  root.add(canopy);
  return root;
}

export function buildHazardPatch(
  x: number,
  z: number,
  y: number,
  r: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(r, 10),
    new THREE.MeshStandardMaterial({
      color: 0x4a3a28,
      roughness: 1,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y + 0.08, z);
  return mesh;
}

export function buildShambler(): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x7ed957, roughness: 0.55 }),
  );
  body.position.y = 0.85;
  root.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xb6f07a, roughness: 0.5 }),
  );
  head.position.y = 1.62;
  root.add(head);
  return root;
}
