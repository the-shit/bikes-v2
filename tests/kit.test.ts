// Node fs is available in the Vitest node env; tsconfig is browser-typed.
// @ts-expect-error -- no @types/node in this package
import { existsSync, readFileSync } from 'node:fs';
import { Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
  KIT_BIKE_URL,
  KIT_RIDER_URL,
  RIDER_REFS_DIR,
  snapRiderToBike,
} from '../src/world/kit';

describe('mesa kit', () => {
  it('points at authored bike and rider glbs', () => {
    expect(KIT_BIKE_URL).toBe('/models/kit-bike.glb');
    expect(KIT_RIDER_URL).toBe('/models/kit-rider.glb');
  });

  it('parents the rider on socket-seat at local origin', () => {
    const bike = new Group();
    const seat = new Object3D();
    seat.name = 'socket-seat';
    seat.position.set(0.12, 0.88, -0.31);
    bike.add(seat);
    const rider = new Object3D();
    rider.position.set(4, 5, 6);

    snapRiderToBike(bike, rider);

    expect(rider.parent).toBe(seat);
    expect(rider.position.x).toBe(0);
    expect(rider.position.y).toBe(0);
    expect(rider.position.z).toBe(0);
  });

  it('binds the seated rider to Jordan likeness refs', () => {
    expect(existsSync(`${RIDER_REFS_DIR}/jordan-face-front.jpg`)).toBe(true);
    expect(existsSync(`${RIDER_REFS_DIR}/jordan-feet-flipflops.jpg`)).toBe(true);
    const src = readFileSync('tools/models/kit/rider.py', 'utf8');
    expect(src).toMatch(/tools\/models\/rider\/refs/);
    expect(src).toMatch(/beard/i);
    expect(src).toMatch(/flop/i);
    expect(src).toMatch(/No helmets/);
  });

  it('falls back to 0, 0.96, -0.22 when the seat socket is missing', () => {
    const bike = new Group();
    const rider = new Object3D();
    rider.position.set(1, 2, 3);

    snapRiderToBike(bike, rider);

    expect(rider.parent).toBe(bike);
    expect(rider.position.x).toBeCloseTo(0, 8);
    expect(rider.position.y).toBeCloseTo(0.96, 8);
    expect(rider.position.z).toBeCloseTo(-0.22, 8);
  });
});
