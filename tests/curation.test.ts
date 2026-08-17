import { describe, expect, it } from 'vitest';
import mesa from '../public/data/mesa-az.json';
import { CIRCLE_K_PIN } from '../src/world/charge';
import { curatedSpots, flipSpawnPins, rampsFromSpots } from '../src/world/curation';
import { COSTCO_PIN } from '../src/world/landmarks';
import { buildMesaPlay } from '../src/world/mesa';
import { parseMesaBake } from '../src/world/osm';

describe('curation layer', () => {
  const bake = parseMesaBake(mesa);
  const play = buildMesaPlay(bake);

  it('places jumps, chokes, loot, and landmark charge including Circle K', () => {
    const kinds = new Set(play.spots.map((s) => s.kind));
    expect(kinds.has('jump')).toBe(true);
    expect(kinds.has('choke')).toBe(true);
    expect(kinds.has('loot')).toBe(true);
    expect(kinds.has('charge')).toBe(true);
    expect(play.spots.some((s) => s.id === 'charge-ck')).toBe(true);
    expect(play.ramps.length).toBeGreaterThan(0);
    expect(play.chargePoints.some((p) => p.kind === 'circlek')).toBe(true);
    expect(play.chargePoints.some((p) => p.id === 'costco')).toBe(true);
    const ck = play.chargePoints.find((p) => p.kind === 'circlek');
    expect(ck?.x).toBeCloseTo(CIRCLE_K_PIN.x, 1);
    expect(ck?.z).toBeCloseTo(CIRCLE_K_PIN.z, 1);
    expect(play.landmarks.some((l) => l.style === 'costco')).toBe(true);
    expect(COSTCO_PIN.x).toBeCloseTo(-240.2, 1);
  });

  it('seeds post-flip shamblers off the home lot', () => {
    const pins = flipSpawnPins(play.spots, play.home);
    expect(pins.length).toBeGreaterThan(3);
    expect(
      pins.every((p) => Math.hypot(p.x - play.home.x, p.z - play.home.z) > 20),
    ).toBe(true);
    expect(rampsFromSpots(curatedSpots({ home: play.home, jan: play.jan })).length).toBeGreaterThan(
      0,
    );
  });

  it('builds the full OSM neighborhood from the bake', () => {
    expect(play.roads.length).toBe(bake.roads.length);
    expect(play.roads.length).toBeGreaterThan(400);
    expect(play.hoodLots.length).toBeGreaterThan(20);
    expect(
      play.hoodLots.every(
        (lot) => Math.hypot(lot.x - play.home.x, lot.z - play.home.z) > 30,
      ),
    ).toBe(true);
  });
});
