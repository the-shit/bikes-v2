/**
 * Ownership: pointer orbit for asset review. Not gameplay.
 * Talks via: camera. Do not read KeyboardEvent.
 * Budget: keep this file under ~300 lines.
 */

import type { PerspectiveCamera } from 'three';

export type LookHandle = { dispose(): void };

/**
 * Drag to orbit a target. Asset feedback, not ride feel.
 */
export function enableAssetLook(
  canvas: HTMLElement,
  camera: PerspectiveCamera,
  target = { x: 3.2, y: 0.8, z: 6.5 },
): LookHandle {
  let yaw = 0.7;
  let pitch = 0.38;
  let dist = 4.8;
  let drag: { x: number; y: number } | null = null;

  function apply(): void {
    const cp = Math.cos(pitch);
    camera.position.set(
      target.x + Math.sin(yaw) * cp * dist,
      target.y + Math.sin(pitch) * dist,
      target.z + Math.cos(yaw) * cp * dist,
    );
    camera.lookAt(target.x, target.y, target.z);
  }

  function onDown(ev: PointerEvent): void {
    if (ev.button !== 0) {
      return;
    }
    drag = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture?.(ev.pointerId);
  }

  function onMove(ev: PointerEvent): void {
    if (!drag) {
      return;
    }
    yaw -= (ev.clientX - drag.x) * 0.006;
    pitch += (ev.clientY - drag.y) * 0.005;
    pitch = Math.max(0.08, Math.min(1.2, pitch));
    drag = { x: ev.clientX, y: ev.clientY };
    apply();
  }

  function onUp(): void {
    drag = null;
  }

  function onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    dist = Math.max(2.2, Math.min(14, dist + ev.deltaY * 0.01));
    apply();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  apply();

  return {
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}
