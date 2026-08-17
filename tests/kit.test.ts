import { describe, expect, it } from 'vitest';
import { KIT_BIKE_URL, KIT_RIDER_URL } from '../src/world/kit';

describe('mesa kit', () => {
  it('points at authored bike and rider glbs', () => {
    expect(KIT_BIKE_URL).toBe('/models/kit-bike.glb');
    expect(KIT_RIDER_URL).toBe('/models/kit-rider.glb');
  });
});
