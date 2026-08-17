/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBus } from '../src/core/events';
import { mountFeedbackHotkey } from '../src/input/hotkeys';
import { createFeedback } from '../src/ui/feedback';
import { bindFeedbackSnapshot } from '../src/ui/snapshot';

function mockStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  });
}

describe('feedback widget flow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens from the bus, shows a snapshot, sends, and reports status', async () => {
    const fetchImpl = vi.fn(
      async (_url: string, init?: RequestInit) => ({ ok: true, status: 200, init }),
    );
    vi.stubGlobal('fetch', fetchImpl);

    const bus = createBus();
    bindFeedbackSnapshot(bus, () => ({
      position: { x: 8, y: 6, z: 12 },
      speed: 0,
      street: null,
      lat: null,
      lon: null,
      pressure: null,
      buildId: 'dev',
      at: '2026-08-16T00:00:00.000Z',
    }));
    bus.on('feedback:capture-request', () => {
      bus.emit('feedback:capture', { dataUrl: null });
    });

    const widget = createFeedback(document.body, bus);
    const unsub = mountFeedbackHotkey(bus);
    bus.emit('feedback:open', null);

    await vi.waitFor(() => {
      expect(document.querySelector('.fb-modal')?.hasAttribute('hidden')).toBe(false);
    });
    expect(document.querySelector('[data-fb-meta]')?.textContent).toMatch(/xyz 8\.0, 6\.0, 12\.0/);

    const text = document.querySelector('[data-fb-text]') as HTMLTextAreaElement;
    text.value = 'the cube is lonely out here';
    (document.querySelector('[data-fb-send]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(document.querySelector('[data-fb-status]')?.textContent).toMatch(/Got it/);
    });
    expect(fetchImpl).toHaveBeenCalled();
    const posted = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(posted[1]?.body));
    expect(body.schema).toBe('bikes.v2.intent');
    expect(body.text).toMatch(/lonely/);

    bus.emit('feedback:close', null);
    expect(widget.isOpen).toBe(false);
    unsub();
    widget.destroy();
  });

  it('shows a failure when the farm rejects the note', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 400 })),
    );
    const bus = createBus();
    bindFeedbackSnapshot(bus, () => ({
      position: null,
      speed: 0,
      street: null,
      lat: null,
      lon: null,
      pressure: null,
      buildId: 'dev',
      at: '2026-08-16T00:00:00.000Z',
    }));
    bus.on('feedback:capture-request', () => {
      bus.emit('feedback:capture', { dataUrl: null });
    });
    const widget = createFeedback(document.body, bus);
    widget.open();
    await vi.waitFor(() => expect(widget.isOpen).toBe(true));
    (document.querySelector('[data-fb-text]') as HTMLTextAreaElement).value =
      'server said no';
    bus.emit('feedback:send', null);
    await vi.waitFor(() => {
      expect(document.querySelector('[data-fb-status]')?.textContent).toMatch(/Whoops/);
    });
    expect(widget.isOpen).toBe(true);
    widget.destroy();
  });
});
