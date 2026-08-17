import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { enableAssetLook } from '../src/world/look';

const TARGET = { x: 3.2, y: 0.8, z: 6.5 };

type Handler = (ev: unknown) => void;

function mockCanvas() {
  const listeners = new Map<string, Handler>();
  const canvas = {
    addEventListener(type: string, fn: Handler) {
      listeners.set(type, fn);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    setPointerCapture() {},
    fire(type: string, ev: unknown) {
      listeners.get(type)?.(ev);
    },
    has(type: string) {
      return listeners.has(type);
    },
  };
  return canvas;
}

function camDist(camera: PerspectiveCamera): number {
  return Math.hypot(
    camera.position.x - TARGET.x,
    camera.position.y - TARGET.y,
    camera.position.z - TARGET.z,
  );
}

function camPitch(camera: PerspectiveCamera): number {
  return Math.asin((camera.position.y - TARGET.y) / camDist(camera));
}

describe('enableAssetLook', () => {
  it('clamps pitch to 0.08 .. 1.2', () => {
    const canvas = mockCanvas();
    const camera = new PerspectiveCamera(50, 1, 0.1, 200);
    enableAssetLook(canvas as unknown as HTMLElement, camera, TARGET);

    canvas.fire('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
    canvas.fire('pointermove', { clientX: 0, clientY: 800 });
    expect(camPitch(camera)).toBeCloseTo(1.2, 6);

    canvas.fire('pointermove', { clientX: 0, clientY: 1600 });
    expect(camPitch(camera)).toBeCloseTo(1.2, 6);

    canvas.fire('pointerup', {});
    canvas.fire('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 });
    canvas.fire('pointermove', { clientX: 0, clientY: -800 });
    expect(camPitch(camera)).toBeCloseTo(0.08, 6);
  });

  it('clamps distance to 2.2 .. 14', () => {
    const canvas = mockCanvas();
    const camera = new PerspectiveCamera(50, 1, 0.1, 200);
    enableAssetLook(canvas as unknown as HTMLElement, camera, TARGET);

    canvas.fire('wheel', { deltaY: 4000, preventDefault() {} });
    expect(camDist(camera)).toBeCloseTo(14, 6);

    canvas.fire('wheel', { deltaY: 4000, preventDefault() {} });
    expect(camDist(camera)).toBeCloseTo(14, 6);

    canvas.fire('wheel', { deltaY: -4000, preventDefault() {} });
    expect(camDist(camera)).toBeCloseTo(2.2, 6);
  });

  it('dispose drops pointer and wheel listeners', () => {
    const canvas = mockCanvas();
    const camera = new PerspectiveCamera(50, 1, 0.1, 200);
    const handle = enableAssetLook(
      canvas as unknown as HTMLElement,
      camera,
      TARGET,
    );
    const before = camera.position.clone();

    handle.dispose();
    expect(canvas.has('pointerdown')).toBe(false);
    expect(canvas.has('pointermove')).toBe(false);
    expect(canvas.has('pointerup')).toBe(false);
    expect(canvas.has('pointercancel')).toBe(false);
    expect(canvas.has('wheel')).toBe(false);

    canvas.fire('wheel', { deltaY: 4000, preventDefault() {} });
    expect(camera.position.x).toBe(before.x);
    expect(camera.position.y).toBe(before.y);
    expect(camera.position.z).toBe(before.z);
  });
});
