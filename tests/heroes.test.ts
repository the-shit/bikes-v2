import { describe, expect, it } from 'vitest';
import meta from '../public/models/ranch-7620.json';
import { RANCH_URL, RANCH_YAW } from '../src/world/heroes';

describe('7620 hero ranch', () => {
  it('ships Zillow facts on the hero record', () => {
    expect(meta.zpid).toBe(8075144);
    expect(meta.yearBuilt).toBe(1971);
    expect(meta.sqft).toBe(1511);
    expect(meta.lotSqft).toBe(7187);
    expect(meta.exterior).toMatch(/wood/i);
    expect(meta.parking).toMatch(/carport/i);
    expect(meta.url).toBe(RANCH_URL);
    expect(meta.source).toBe('tools/models/ranch_7620.py');
  });

  it('faces the street after the export yaw', () => {
    expect(RANCH_YAW).toBeCloseTo(Math.PI, 8);
  });
});
