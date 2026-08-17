/**
 * Ownership: placeholder combat meshes (bat, arc, pop, speed-lines).
 * Talks via: rider/zombie snapshots. No sim. No asset wait.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { swingArc } from '../combat/melee';
import type { RiderSnapshot } from '../core/session';
import type { Shambler } from '../zombies/ai';

const BAT = 0xe8c36a;
const ARC = 0xffe566;
const POP = 0xfff3a0;
const LINE = 0xfff6d0;

export function attachRiderFx(root: THREE.Group): void {
  const hand = new THREE.Group();
  hand.name = 'bat-hand';
  hand.position.set(0.18, 1.18, 0.12);
  const bat = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 1.45),
    new THREE.MeshStandardMaterial({
      color: BAT,
      roughness: 0.45,
      emissive: 0x4a3810,
      emissiveIntensity: 0.2,
    }),
  );
  bat.position.set(0, 0, 0.72);
  hand.add(bat);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4020, roughness: 0.7 }),
  );
  knob.position.set(0, 0, 0.02);
  hand.add(knob);
  root.add(hand);

  const arc = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.55, 18, 1, Math.PI / 2 - Math.PI / 3, (2 * Math.PI) / 3),
    new THREE.MeshBasicMaterial({
      color: ARC,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  arc.name = 'swing-arc';
  arc.rotation.x = -Math.PI / 2;
  arc.rotation.z = Math.PI;
  arc.position.y = 0.12;
  root.add(arc);

  const lines = new THREE.Group();
  lines.name = 'ram-lines';
  const lineMat = new THREE.MeshBasicMaterial({
    color: LINE,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  for (const [x, y] of [
    [-0.35, 0.7],
    [0.35, 0.85],
    [0, 1.15],
  ]) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 1.1), lineMat);
    dash.position.set(x, y, -1.3);
    lines.add(dash);
  }
  root.add(lines);
}

export function syncRiderFx(root: THREE.Group, rider: RiderSnapshot): void {
  const swing = swingArc(rider.melee);
  const hand = root.getObjectByName('bat-hand');
  if (hand) {
    hand.rotation.y = swing.angle;
    hand.visible = true;
    hand.scale.setScalar(swing.swinging ? 1.08 : 1);
  }
  const arc = root.getObjectByName('swing-arc');
  if (arc instanceof THREE.Mesh) {
    arc.visible = swing.ready;
    const mat = arc.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.32;
  }
  const lines = root.getObjectByName('ram-lines');
  if (lines) {
    const on = rider.ramLinesT > 0;
    lines.visible = on;
    const u = on ? rider.ramLinesT / 0.32 : 0;
    lines.scale.set(1, 1, 0.6 + u);
  }
}

export function attachZombieFx(root: THREE.Group): void {
  const pop = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45),
    new THREE.MeshBasicMaterial({
      color: POP,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  pop.name = 'hit-pop';
  pop.position.y = 1.4;
  pop.visible = false;
  root.add(pop);
}

export function syncZombieFx(root: THREE.Group, z: Shambler): void {
  const pop = root.getObjectByName('hit-pop');
  if (pop instanceof THREE.Mesh) {
    const flashing = z.flashT > 0;
    pop.visible = flashing;
    if (flashing) {
      const u = z.flashT / 0.2;
      pop.scale.setScalar(0.4 + (1 - u) * 1.4);
      (pop.material as THREE.MeshBasicMaterial).opacity = 0.25 + u * 0.7;
    }
  }
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name !== 'hit-pop') {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setHex(z.flashT > 0 ? 0xfff2a8 : 0x000000);
        mat.emissiveIntensity = z.flashT > 0 ? 0.85 : 0;
      }
    }
  });
}

export function attachLockFx(root: THREE.Group): void {
  const g = new THREE.Group();
  g.name = 'lock-reticle';
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff66cc,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 20), ringMat);
  outer.rotation.x = Math.PI / 2;
  outer.position.y = 2.15;
  g.add(outer);
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.04, 8, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffee66,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 2.15;
  g.add(inner);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xfff38a });
  for (let i = 0; i < 4; i += 1) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), starMat);
    star.name = `lock-star-${i}`;
    g.add(star);
  }
  g.visible = false;
  root.add(g);
}

export function syncLockFx(
  root: THREE.Group,
  locked: boolean,
  snapT: number,
  elapsed: number,
): void {
  const g = root.getObjectByName('lock-reticle');
  if (!g) {
    return;
  }
  g.visible = locked;
  if (!locked) {
    return;
  }
  const wobble =
    snapT > 0
      ? 1 + 0.22 * Math.sin(snapT * 42)
      : 1 + 0.05 * Math.sin(elapsed * 6);
  g.scale.setScalar(wobble);
  g.rotation.y = elapsed * 1.4 + snapT * 2;
  for (let i = 0; i < 4; i += 1) {
    const star = g.getObjectByName(`lock-star-${i}`);
    if (!star) {
      continue;
    }
    const a = g.rotation.y + (i * Math.PI) / 2;
    star.position.set(Math.cos(a) * 1.05, 2.15 + Math.sin(a * 2) * 0.12, Math.sin(a) * 1.05);
  }
}

export function zombieSquash(z: Shambler): { x: number; y: number; z: number } {
  if (z.dead) {
    return { x: 1.55, y: 0.14, z: 1.55 };
  }
  if (z.squashT > 0) {
    return { x: 1.35, y: 0.42, z: 1.35 };
  }
  return { x: 1, y: 1, z: 1 };
}
