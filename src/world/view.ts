/**
 * Ownership: M1 Three.js view of the Jan Ave slice. No sim here.
 * Talks via: JanSlice + SessionSnapshot. Do not step physics.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import type { SessionSnapshot } from '../core/session';
import { roadWidth, sampleElevGrid } from './geo';
import { placeHeroes } from './heroes';
import {
  attachLockFx,
  attachRiderFx,
  attachZombieFx,
  syncLockFx,
  syncRiderFx,
  syncZombieFx,
  zombieSquash,
} from './fx';
import {
  buildBike,
  buildHome,
  buildPalm,
  buildRanch,
  buildShambler,
} from './props';
import type { JanSlice } from './slice';

export type WorldView = {
  group: THREE.Group;
  sync(snap: SessionSnapshot): void;
};

const SAND = 0xc4a574;
const ASPHALT = 0x3f3f48;

export function createWorldView(slice: JanSlice): WorldView {
  const group = new THREE.Group();
  group.name = 'jan-slice';

  group.add(new THREE.HemisphereLight(0xfff0d8, 0x8a6a45, 0.85));
  const sun = new THREE.DirectionalLight(0xffe0a8, 1.25);
  sun.position.set(40, 55, 25);
  group.add(sun);

  group.add(buildGround(slice));
  group.add(buildRoads(slice));
  const homePrim = buildHome(slice);
  group.add(homePrim);
  void placeHeroes(group, {
    x: slice.home.x,
    z: slice.home.z,
    y: slice.terrain.sampleHeight(slice.home.x, slice.home.z),
    yaw: slice.home.faceYaw,
  }).then((ranch) => {
    if (ranch) {
      homePrim.visible = false;
    }
  });
  for (const lot of slice.lots) {
    group.add(buildRanch(lot.x, lot.z, lot.yaw, slice.terrain.sampleHeight));
    group.add(buildPalm(lot.palm.x, lot.palm.z, slice.terrain.sampleHeight));
  }

  const bikeMeshes = new Map<number, THREE.Group>();
  const zomMeshes = new Map<number, THREE.Group>();
  const lockMeshes = new Map<number, THREE.Group>();

  return {
    group,
    sync(snap) {
      const liveRiders = new Set(snap.riders.map((r) => r.id));
      for (const [id, mesh] of bikeMeshes) {
        if (!liveRiders.has(id)) {
          group.remove(mesh);
          bikeMeshes.delete(id);
        }
      }
      for (const rider of snap.riders) {
        let mesh = bikeMeshes.get(rider.id);
        if (!mesh) {
          mesh = buildBike();
          attachRiderFx(mesh);
          bikeMeshes.set(rider.id, mesh);
          group.add(mesh);
        }
        const b = rider.bike;
        mesh.position.set(b.x, b.y, b.z);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = b.yaw;
        mesh.rotation.z = b.lean;
        syncRiderFx(mesh, rider);
      }
      const liveZ = new Set(snap.zombies.map((z) => z.id));
      for (const [id, mesh] of zomMeshes) {
        if (!liveZ.has(id)) {
          group.remove(mesh);
          zomMeshes.delete(id);
        }
      }
      for (const z of snap.zombies) {
        let mesh = zomMeshes.get(z.id);
        if (!mesh) {
          mesh = buildShambler();
          attachZombieFx(mesh);
          zomMeshes.set(z.id, mesh);
          group.add(mesh);
        }
        mesh.position.set(z.x, z.y, z.z);
        mesh.rotation.y = z.yaw;
        mesh.rotation.x = 0;
        const squash = zombieSquash(z);
        mesh.scale.set(squash.x, squash.y, squash.z);
        mesh.visible = true;
        syncZombieFx(mesh, z);
      }
      const locked = new Map(
        snap.riders
          .filter((r) => r.lock.targetId != null)
          .map((r) => [r.lock.targetId as number, r.lock.snapT]),
      );
      const liveLock = new Set(locked.keys());
      for (const [id, mesh] of lockMeshes) {
        if (!liveLock.has(id)) {
          group.remove(mesh);
          lockMeshes.delete(id);
        }
      }
      for (const [id, snapT] of locked) {
        const z = snap.zombies.find((s) => s.id === id);
        if (!z || z.dead) {
          continue;
        }
        let mesh = lockMeshes.get(id);
        if (!mesh) {
          mesh = new THREE.Group();
          attachLockFx(mesh);
          lockMeshes.set(id, mesh);
          group.add(mesh);
        }
        mesh.position.set(z.x, z.y, z.z);
        syncLockFx(mesh, true, snapT);
      }
    },
  };
}

function buildGround(slice: JanSlice): THREE.Mesh {
  const half = 140;
  const segs = 56;
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(SAND);
  const rock = new THREE.Color(0x8b7355);
  const ash = new THREE.Color(ASPHALT);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = sampleElevGrid(x, z, slice.terrain.map);
    pos.setY(i, y);
    const near = nearestRoadDist(x, z, slice.nearbyRoads);
    const c = sand.clone().lerp(rock, 0.2);
    if (near && near.dist < near.halfW) {
      c.copy(ash);
    } else if (near && near.dist < near.halfW + 3) {
      c.lerp(ash, 0.35);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
    }),
  );
}

function nearestRoadDist(
  x: number,
  z: number,
  roads: JanSlice['nearbyRoads'],
): { dist: number; halfW: number } | null {
  let best: { dist: number; halfW: number } | null = null;
  for (const road of roads) {
    const halfW = roadWidth(road.highway) * 0.5;
    for (let i = 1; i < road.points.length; i += 1) {
      const [x0, z0] = road.points[i - 1];
      const [x1, z1] = road.points[i];
      const d = pointSegDist(x, z, x0, z0, x1, z1);
      if (!best || d < best.dist) {
        best = { dist: d, halfW };
      }
    }
  }
  return best;
}

function pointSegDist(
  x: number,
  z: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
  return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
}

function buildRoads(slice: JanSlice): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: ASPHALT,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  for (const road of slice.nearbyRoads) {
    const mesh = roadRibbon(road.points, roadWidth(road.highway), slice);
    if (mesh) {
      mesh.material = mat;
      g.add(mesh);
    }
  }
  return g;
}

function roadRibbon(
  points: number[][],
  width: number,
  slice: JanSlice,
): THREE.Mesh | null {
  if (points.length < 2) {
    return null;
  }
  const halfW = width * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const [x, z] = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    const lx = -tz / len;
    const lz = tx / len;
    for (const side of [-1, 1]) {
      const rx = x + lx * halfW * side;
      const rz = z + lz * halfW * side;
      const y =
        Math.max(
          slice.terrain.sampleHeight(x, z),
          slice.terrain.sampleHeight(rx, rz),
        ) + 0.12;
      positions.push(rx, y, rz);
    }
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const L0 = i * 2;
    indices.push(L0, L0 + 2, L0 + 1, L0 + 1, L0 + 2, L0 + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
}
