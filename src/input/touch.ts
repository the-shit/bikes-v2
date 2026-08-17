/**
 * Ownership: pointer drag → Intent. Not a D-pad.
 * Talks via: Intent. Horizontal drag steers, vertical is throttle/brake.
 * Budget: keep this file under ~300 lines.
 */

import { isTypingTarget } from './bindings';
import { clampAxis, idleIntent, type Intent } from './intents';

export type TouchAdapter = {
  sample(): Intent;
  dispose(): void;
};

export const TOUCH = {
  tapPx: 14,
  tapMs: 280,
  radiusFrac: 0.22,
  minRadius: 56,
} as const;

export type Drag = { x0: number; y0: number; x: number; y: number; at: number };

export function dragRadius(width: number, height: number): number {
  const short = Math.min(Math.max(1, width), Math.max(1, height));
  return Math.max(TOUCH.minRadius, short * TOUCH.radiusFrac);
}

export function intentFromDrag(drag: Drag, radius: number): Intent {
  const dx = drag.x - drag.x0;
  const dy = drag.y - drag.y0;
  const r = Math.max(1, radius);
  const steer = clampAxis(-dx / r);
  const drive = clampAxis(-dy / r);
  return {
    ...idleIntent(),
    steer,
    throttle: drive > 0 ? drive : 0,
    brake: drive < 0 ? -drive : 0,
  };
}

export function isTap(drag: Drag, now: number): boolean {
  const dist = Math.hypot(drag.x - drag.x0, drag.y - drag.y0);
  return dist < TOUCH.tapPx && now - drag.at < TOUCH.tapMs;
}

export function createTouchAdapter(
  target: EventTarget | null = null,
  opts: { radius?: number; now?: () => number } = {},
): TouchAdapter {
  let drag: Drag | null = null;
  let intent = idleIntent();
  const now = opts.now ?? (() => Date.now());

  if (!target || typeof target.addEventListener !== 'function') {
    return {
      sample() {
        return idleIntent();
      },
      dispose() {},
    };
  }

  const onDown = (event: Event) => {
    const e = event as PointerEvent;
    if (e.isPrimary === false) {
      return;
    }
    if (e.button != null && e.button !== 0) {
      return;
    }
    if (ignoreTarget(e.target)) {
      return;
    }
    drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, at: now() };
    intent = idleIntent();
    e.preventDefault?.();
    const el = e.target as { setPointerCapture?: (id: number) => void } | null;
    el?.setPointerCapture?.(e.pointerId);
  };

  const onMove = (event: Event) => {
    if (!drag) {
      return;
    }
    const e = event as PointerEvent;
    drag = { ...drag, x: e.clientX, y: e.clientY };
    intent = intentFromDrag(drag, radiusOf(opts.radius, target));
    e.preventDefault?.();
  };

  const onUp = (event: Event) => {
    if (!drag) {
      return;
    }
    const e = event as PointerEvent;
    drag = { ...drag, x: e.clientX, y: e.clientY };
    intent = isTap(drag, now())
      ? { ...idleIntent(), melee: true }
      : idleIntent();
    drag = null;
  };

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onUp);

  return {
    sample() {
      const out = intent;
      if (out.melee && !drag) {
        intent = idleIntent();
      }
      return out;
    },
    dispose() {
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    },
  };
}

function radiusOf(override: number | undefined, target: EventTarget): number {
  if (override && override > 0) {
    return override;
  }
  const el = target as { clientWidth?: number; clientHeight?: number };
  const w = el.clientWidth ?? 390;
  const h = el.clientHeight ?? 844;
  return dragRadius(w, h);
}

function ignoreTarget(el: EventTarget | null): boolean {
  if (isTypingTarget(el)) {
    return true;
  }
  if (!el || typeof el !== 'object') {
    return false;
  }
  const node = el as { closest?: (sel: string) => unknown };
  return Boolean(node.closest?.('#feedback-root'));
}
