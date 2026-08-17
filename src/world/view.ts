/**
 * Ownership: M1 Three.js view of the Jan Ave slice. No sim here.
 * Talks via: JanSlice + SessionSnapshot. Do not step physics.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import type { SessionSnapshot } from '../core/session';
import { buildGround, buildRoads } from './ground';
import { placeHeroes } from './heroes';
import { loadKitRig } from './kit';
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
  buildCircleK,
  buildHazardPatch,
  buildSandPad,
  buildHome,
  buildPalm,
  buildRanch,
  buildShambler,
  buildWalker,
} from './props';
import type { JanSlice } from './slice';

export type WorldView = {
  group: THREE.Group;
  sync(snap: SessionSnapshot): void;
};

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

  for (const pt of slice.chargePoints) {
    if (pt.kind === 'circlek') {
      const y = slice.terrain.sampleHeight(pt.x, pt.z);
      group.add(buildSandPad(pt.x, pt.z, y));
      group.add(buildCircleK(pt.x, pt.z, y));
    }
  }
  for (const h of slice.hazards) {
    group.add(
      buildHazardPatch(
        h.x,
        h.z,
        slice.terrain.sampleHeight(h.x, h.z),
        h.r,
      ),
    );
  }

  const bikeMeshes = new Map<number, THREE.Group>();
  const walkMeshes = new Map<number, THREE.Group>();
  const zomMeshes = new Map<number, THREE.Group>();
  const lockMeshes = new Map<number, THREE.Group>();
  let fxClock = 0;
  let kitProto: THREE.Group | null = null;
  void loadKitRig().then((rig) => {
    if (!rig) {
      return;
    }
    kitProto = rig;
    for (const [id, old] of bikeMeshes) {
      const next = rig.clone(true);
      attachRiderFx(next);
      next.position.copy(old.position);
      next.rotation.copy(old.rotation);
      group.remove(old);
      group.add(next);
      bikeMeshes.set(id, next);
    }
  });

  return {
    group,
    sync(snap) {
      fxClock += 1 / 60;
      syncKeyed(group, bikeMeshes, snap.bikes.map((b) => b.id), () => {
        const mesh = kitProto ? kitProto.clone(true) : buildBike(true);
        attachRiderFx(mesh);
        return mesh;
      });
      for (const b of snap.bikes) {
        const mesh = bikeMeshes.get(b.id);
        if (!mesh) {
          continue;
        }
        mesh.position.set(b.pose.x, b.pose.y, b.pose.z);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = b.pose.yaw;
        mesh.rotation.z = b.pose.lean;
        const seated = b.occupantId != null;
        for (const name of ['rider', 'kit-rider']) {
          const cap = mesh.getObjectByName(name);
          if (cap) {
            cap.visible = seated;
          }
        }
        const rider = snap.riders.find((r) => r.id === b.occupantId);
        if (rider) {
          syncRiderFx(mesh, rider);
        }
      }
      const walkers = snap.riders.filter((r) => r.mountedBikeId == null);
      syncKeyed(group, walkMeshes, walkers.map((r) => r.id), buildWalker);
      for (const r of walkers) {
        const mesh = walkMeshes.get(r.id);
        if (!mesh) {
          continue;
        }
        mesh.position.set(r.bike.x, r.bike.y, r.bike.z);
        mesh.rotation.y = r.bike.yaw;
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
      const liveLock = new Set(
        snap.riders.filter((r) => r.lock.targetId != null).map((r) => r.id),
      );
      for (const [id, mesh] of lockMeshes) {
        if (!liveLock.has(id)) {
          group.remove(mesh);
          lockMeshes.delete(id);
        }
      }
      for (const rider of snap.riders) {
        const tid = rider.lock.targetId;
        if (tid == null) {
          continue;
        }
        const z = snap.zombies.find((s) => s.id === tid);
        if (!z || z.dead) {
          continue;
        }
        let mesh = lockMeshes.get(rider.id);
        if (!mesh) {
          mesh = new THREE.Group();
          attachLockFx(mesh);
          lockMeshes.set(rider.id, mesh);
          group.add(mesh);
        }
        mesh.position.set(z.x, z.y + rider.id * 0.04, z.z);
        syncLockFx(mesh, true, rider.lock.snapT, fxClock);
      }
    },
  };
}

function syncKeyed(
  group: THREE.Group,
  map: Map<number, THREE.Group>,
  ids: readonly number[],
  make: () => THREE.Group,
): void {
  const live = new Set(ids);
  for (const [id, mesh] of map) {
    if (!live.has(id)) {
      group.remove(mesh);
      map.delete(id);
    }
  }
  for (const id of ids) {
    if (map.has(id)) {
      continue;
    }
    const mesh = make();
    map.set(id, mesh);
    group.add(mesh);
  }
}
