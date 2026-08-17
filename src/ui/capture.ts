/**
 * Ownership: canvas JPEG capture for feedback (no WebGL in tests).
 * Talks via: EventBus topics feedback:capture*. Widget never imports renderer.
 * Budget: keep this file under ~300 lines.
 */

import type { EventBus } from '../core/events';

export type CaptureResult = {
  dataUrl: string | null;
};

export type JpegOpts = {
  maxWidth?: number;
  quality?: number;
};

export function captureCanvasJpeg(
  canvas: HTMLCanvasElement,
  opts: JpegOpts = {},
): string | null {
  try {
    const maxWidth = opts.maxWidth ?? 1280;
    const quality = opts.quality ?? 0.65;
    if (canvas.width <= maxWidth || typeof document === 'undefined') {
      return canvas.toDataURL('image/jpeg', quality);
    }
    const scale = maxWidth / canvas.width;
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(canvas.width * scale));
    off.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = off.getContext('2d');
    if (!ctx) {
      return canvas.toDataURL('image/jpeg', quality);
    }
    ctx.drawImage(canvas, 0, 0, off.width, off.height);
    return off.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

export function collectCapture(
  bus: EventBus,
  timeoutMs = 250,
): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve(null);
    }, timeoutMs);
    const off = bus.on<CaptureResult>('feedback:capture', (payload) => {
      clearTimeout(timer);
      off();
      resolve(payload?.dataUrl ?? null);
    });
    bus.emit('feedback:capture-request', null);
  });
}

export function bindFeedbackCapture(
  bus: EventBus,
  canvas: HTMLCanvasElement,
): { afterRender(): void; dispose(): void } {
  let pending = false;
  const off = bus.on('feedback:capture-request', () => {
    pending = true;
  });
  return {
    afterRender() {
      if (!pending) {
        return;
      }
      pending = false;
      bus.emit<CaptureResult>('feedback:capture', {
        dataUrl: captureCanvasJpeg(canvas),
      });
    },
    dispose() {
      off();
    },
  };
}
