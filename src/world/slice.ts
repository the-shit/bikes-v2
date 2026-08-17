/**
 * Ownership: M1 Jan Ave play slice — spawn, lots, shambler pins.
 * Talks via: poses + road lists. View consumes this; sim does not render.
 * Budget: keep this file under ~300 lines.
 */

import { spawnOnNearestRoad, type RoadPoly } from './geo';
import {
  HOME_CAMERA_BLOCKERS_LOCAL,
  HOME_SETBACK_M,
  HOME_SIDE_SIGN,
  homeBikeSpawn,
  homePlacement,
  type HomePlace,
} from './home';
import {
  findHomeJanRoad,
  findJanRoads,
  janStreetPoints,
  layoutJanLots,
  roadsNear,
  type JanLot,
} from './jan';
import type { MesaBake } from './osm';
import { createTerrain, type Terrain } from './terrain';

export const SLICE_RADIUS_M = 160;

export type JanSlice = {
  terrain: Terrain;
  home: HomePlace;
  spawn: { x: number; z: number; yaw: number };
  jan: RoadPoly | null;
  janRoads: RoadPoly[];
  nearbyRoads: RoadPoly[];
  lots: JanLot[];
  shamblerPins: { x: number; z: number }[];
  cameraFrame: HomePlace;
  blockers: typeof HOME_CAMERA_BLOCKERS_LOCAL;
};

export function buildJanSlice(bake: MesaBake): JanSlice {
  const terrain = createTerrain(bake);
  const roadSpawn = spawnOnNearestRoad(bake.roads);
  const home = homePlacement(roadSpawn, HOME_SETBACK_M, HOME_SIDE_SIGN);
  const spawn = homeBikeSpawn(home);
  const janRoads = findJanRoads(bake.roads);
  const jan = findHomeJanRoad(bake.roads, home);
  const lots = jan ? layoutJanLots(jan, home) : [];
  const nearbyRoads = roadsNear(bake.roads, home, SLICE_RADIUS_M);
  const driveway = {
    x: home.x + Math.sin(home.faceYaw) * 18,
    z: home.z + Math.cos(home.faceYaw) * 18,
  };
  const along = jan ? janStreetPoints(jan, home, 2, 22) : [];
  const shamblerPins = [driveway, ...along].slice(0, 3);
  return {
    terrain,
    home,
    spawn,
    jan,
    janRoads,
    nearbyRoads,
    lots,
    shamblerPins,
    cameraFrame: home,
    blockers: HOME_CAMERA_BLOCKERS_LOCAL,
  };
}
