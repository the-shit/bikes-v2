import { describe, expect, it } from 'vitest';
import { createSession } from '../src/core/session';
import { idleIntent } from '../src/input/intents';
import { createHud } from '../src/ui/hud';
import { garageChargePoint } from '../src/world/charge';
import { HOME_CAMERA_BLOCKERS_LOCAL } from '../src/world/home';
import { createTerrain } from '../src/world/terrain';

function mockHudRoot(): HTMLElement {
  const kids = new Map<string, { textContent: string; hidden: boolean; dataset: Record<string, string> }>();
  const root = {
    innerHTML: '',
    querySelector(sel: string) {
      if (!kids.has(sel)) {
        kids.set(sel, { textContent: '', hidden: false, dataset: {} });
      }
      return kids.get(sel);
    },
  };
  return root as unknown as HTMLElement;
}

describe('hud', () => {
  it('shows battery, psi, and on-foot after dismount', () => {
    const el = mockHudRoot();
    const points = [garageChargePoint({ x: 0, z: 0 })];
    const hud = createHud(el, points);
    const session = createSession({
      riders: [{ id: 1, x: 0, z: 0, yaw: 0 }],
      terrain: createTerrain(),
      cameraFrame: { x: 0, z: 0, faceYaw: 0 },
      blockers: HOME_CAMERA_BLOCKERS_LOCAL,
      shamblerPins: [],
      chargePoints: points,
    });
    hud.update(session.snapshot(), 1, 60);
    const ride = el.querySelector('[data-ride]') as { textContent: string };
    expect(ride.textContent).toMatch(/batt/);
    expect(ride.textContent).toMatch(/psi/);
    session.tick(1 / 60, { 1: { ...idleIntent(), mount: true } });
    hud.update(session.snapshot(), 1, 60);
    expect(ride.textContent).toMatch(/ON FOOT/);
  });
});
