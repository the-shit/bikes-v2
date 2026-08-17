import { describe, expect, it } from 'vitest';
import {
  createTouchAdapter,
  dragRadius,
  intentFromDrag,
  isTap,
  TOUCH,
} from '../src/input/touch';

describe('touch drag', () => {
  it('uses a larger radius on desktop than a phone viewport', () => {
    const phone = dragRadius(390, 844);
    const desktop = dragRadius(1280, 720);
    expect(phone).toBeGreaterThanOrEqual(TOUCH.minRadius);
    expect(desktop).toBeGreaterThan(phone);
    expect(phone).toBeCloseTo(390 * TOUCH.radiusFrac);
  });

  it('maps left/up drag to +steer / throttle — not a D-pad', () => {
    const origin = { x0: 200, y0: 400, x: 200, y: 400, at: 0 };
    const left = intentFromDrag({ ...origin, x: 120 }, 80);
    const up = intentFromDrag({ ...origin, y: 320 }, 80);
    const down = intentFromDrag({ ...origin, y: 480 }, 80);
    expect(left.steer).toBeCloseTo(1);
    expect(up.throttle).toBeCloseTo(1);
    expect(up.brake).toBe(0);
    expect(down.brake).toBeCloseTo(1);
    expect(down.throttle).toBe(0);
  });

  it('treats a short press as a tap (melee), not a drag', () => {
    const tap = { x0: 10, y0: 10, x: 12, y: 11, at: 1000 };
    expect(isTap(tap, 1100)).toBe(true);
    expect(isTap({ ...tap, x: 80 }, 1100)).toBe(false);
    expect(isTap(tap, 2000)).toBe(false);
  });

  it('drives intents from pointer events on an injected target', () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      clientWidth: 390,
      clientHeight: 844,
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    };
    const touch = createTouchAdapter(target as unknown as EventTarget, {
      radius: 80,
    });
    listeners.get('pointerdown')?.(
      { clientX: 200, clientY: 400, button: 0, isPrimary: true, preventDefault() {} } as unknown as Event,
    );
    listeners.get('pointermove')?.(
      { clientX: 120, clientY: 320, preventDefault() {} } as unknown as Event,
    );
    const held = touch.sample();
    expect(held.steer).toBeGreaterThan(0.5);
    expect(held.throttle).toBeGreaterThan(0.5);
    listeners.get('pointerup')?.(
      { clientX: 120, clientY: 320 } as unknown as Event,
    );
    expect(touch.sample()).toMatchObject({ steer: 0, throttle: 0, melee: false });
    touch.dispose();
    expect(listeners.size).toBe(0);
  });
});
