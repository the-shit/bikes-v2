/**
 * Ownership: hand-placed play spaces on the OSM backbone.
 * Talks via: curated markers (jumps, loot, charge). Not raw OSM.
 * Budget: keep this file under ~300 lines.
 */

export type CuratedSpot = {
  id: string;
  kind: 'jump' | 'loot' | 'charge' | 'choke';
  x: number;
  z: number;
};

/** Stub. M3. */
export function curatedSpots(): CuratedSpot[] {
  return [];
}
