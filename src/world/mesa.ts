/**
 * Ownership: full OSM Mesa playfield (Jan spawn + hood + curation).
 * Talks via: MesaPlay. View/session consume this; no WebGL here.
 * Budget: keep this file under ~300 lines.
 */

import {
  curatedSpots,
  flipSpawnPins,
  rampsFromSpots,
  type CuratedSpot,
} from './curation';
import type { RoadPoly } from './geo';
import type { JanLot } from './jan';
import type { Ramp } from './jumps';
import {
  landmarkChargePoints,
  mesaLandmarks,
  type LandmarkPin,
} from './landmarks';
import { layoutHoodLots } from './neighborhood';
import type { MesaBake } from './osm';
import { buildJanSlice, type JanSlice } from './slice';

export type MesaPlay = JanSlice & {
  roads: RoadPoly[];
  hoodLots: JanLot[];
  spots: CuratedSpot[];
  ramps: Ramp[];
  landmarks: LandmarkPin[];
};

export function buildMesaPlay(bake: MesaBake): MesaPlay {
  const slice = buildJanSlice(bake);
  const landmarks = mesaLandmarks(bake.roads);
  const spots = curatedSpots({
    home: slice.home,
    jan: slice.jan,
    landmarks,
  });
  const extraCharge = landmarkChargePoints(landmarks);
  const known = new Set(slice.chargePoints.map((p) => p.id));
  return {
    ...slice,
    chargePoints: [
      ...slice.chargePoints,
      ...extraCharge.filter((p) => !known.has(p.id)),
    ],
    shamblerPins: flipSpawnPins(spots, slice.home),
    roads: bake.roads,
    hoodLots: layoutHoodLots(bake.roads, slice.home),
    spots,
    ramps: rampsFromSpots(spots),
    landmarks,
  };
}
