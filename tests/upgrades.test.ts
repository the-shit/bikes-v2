import { describe, expect, it } from 'vitest';
import { createBag } from '../src/bike/bag';
import {
  armorMaxHp,
  createUpgrades,
  drainScale,
  nextUpgrade,
  tryEquip,
} from '../src/bike/upgrades';

describe('bike upgrades', () => {
  it('installs the next affordable part and spends the bag', () => {
    const bag = createBag({ cells: 3, plates: 3 });
    const id = nextUpgrade(createUpgrades(), bag);
    expect(id).toBe('battery');
    const fitted = tryEquip(createUpgrades(), bag, 'battery');
    expect(fitted?.upgrades.equipped).toContain('battery');
    expect(fitted?.bag.cells).toBe(0);
    expect(drainScale(fitted!.upgrades)).toBeLessThan(1);
    expect(tryEquip(fitted!.upgrades, fitted!.bag, 'battery')).toBeNull();
  });

  it('armor raises max hearts', () => {
    expect(armorMaxHp(createUpgrades())).toBe(3);
    const fitted = tryEquip(createUpgrades(), createBag({ plates: 3 }), 'armor');
    expect(armorMaxHp(fitted!.upgrades)).toBe(5);
  });
});
