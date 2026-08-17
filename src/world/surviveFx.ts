/**
 * Ownership: throwable meshes + looted-flag dim. No sim.
 * Talks via: SessionSnapshot. View calls this each frame.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import type { SessionSnapshot } from '../core/session';

const shotMeshes = new WeakMap<THREE.Group, Map<number, THREE.Mesh>>();

export function tintZombie(mesh: THREE.Group, kind: string, soaked: number): void {
  const hex =
    soaked > 0 ? 0x6ec8ff : kind === 'sprinter' ? 0xc6f25a : kind === 'bruiser' ? 0x6b8f3a : 0x7ed957;
  mesh.traverse((obj) => {
    const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (mat && 'color' in mat) {
      mat.color.setHex(hex);
    }
  });
}

export function tintUpgrades(mesh: THREE.Group, equipped: readonly string[]): void {
  attachGizmo(mesh, 'upgrade-rack', 'socket-rack', equipped.includes('rack'), 0x8a6a3a, [0, 0.85, -0.55]);
  attachGizmo(mesh, 'upgrade-armor', 'socket-armor', equipped.includes('armor'), 0xb8c0c8, [0, 0.62, 0.05]);
  attachGizmo(mesh, 'upgrade-mount', 'socket-mount', equipped.includes('mount'), 0x333338, [0.22, 1.02, 0.52]);
}

function attachGizmo(
  mesh: THREE.Group,
  name: string,
  socket: string,
  on: boolean,
  color: number,
  fallback: [number, number, number],
): void {
  let gizmo = mesh.getObjectByName(name);
  if (!gizmo && on) {
    gizmo = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.5),
      new THREE.MeshStandardMaterial({ color }),
    );
    gizmo.name = name;
    const sock = mesh.getObjectByName(socket) ?? mesh.getObjectByName('socket-seat');
    if (sock) {
      sock.add(gizmo);
    } else {
      gizmo.position.set(...fallback);
      mesh.add(gizmo);
    }
  }
  if (gizmo) {
    gizmo.visible = on;
  }
}

export function syncSurviveFx(group: THREE.Group, snap: SessionSnapshot): void {
  let map = shotMeshes.get(group);
  if (!map) {
    map = new Map();
    shotMeshes.set(group, map);
  }
  const live = new Set(snap.shots.map((s) => s.id));
  for (const [id, mesh] of map) {
    if (!live.has(id)) {
      group.remove(mesh);
      map.delete(id);
    }
  }
  for (const s of snap.shots) {
    let mesh = map.get(s.id);
    if (!mesh) {
      const color =
        s.kind === 'balloon' ? 0x4fc3f7 : s.kind === 'slingshot' ? 0xffee88 : 0x8a8070;
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(s.kind === 'balloon' ? 0.18 : 0.1, 8, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.45 }),
      );
      map.set(s.id, mesh);
      group.add(mesh);
    }
    mesh.position.set(s.x, s.y, s.z);
  }
  group.traverse((obj) => {
    if (obj.name.startsWith('loot-flag-')) {
      const id = obj.name.slice('loot-flag-'.length);
      const house = snap.houses.find((h) => h.id === id);
      if (house) {
        obj.visible = !house.looted;
      }
    }
  });
}
