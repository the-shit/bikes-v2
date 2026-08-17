import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBus } from '../src/core/events';
import { captureCanvasJpeg, collectCapture } from '../src/ui/capture';
import {
  bindFeedbackSnapshot,
  collectSnapshot,
  emptySnapshot,
  formatSnapshotLine,
} from '../src/ui/snapshot';
import {
  INTENT_KIND,
  INTENT_SCHEMA,
  resolveFeedbackEndpoint,
} from '../src/ui/intent';
import {
  FEEDBACK_STORE_KEY,
  buildFeedbackPayload,
  flushStashedFeedback,
  readStash,
  submitFeedback,
  validateFeedbackDraft,
} from '../src/ui/submit';
import { isTypingTarget } from '../src/input/hotkeys';

function mockStorage() {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  } as Storage;
}

describe('feedback snapshot + serialize', () => {
  it('includes position, speed, build id, and timestamp', () => {
    const snap = {
      position: { x: 8, y: 6, z: 12 },
      speed: 10,
      street: 'East Jan Avenue',
      lat: 33.38,
      lon: -111.66,
      pressure: 0.8,
      buildId: 'abc1234',
      at: '2026-08-16T00:00:00.000Z',
    };
    const payload = buildFeedbackPayload({
      message: 'cube is lonely',
      name: 'Jordan',
      featureIdea: false,
      snapshot: snap,
    });
    expect(payload.schema).toBe(INTENT_SCHEMA);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.kind).toBe(INTENT_KIND.playerFeedback);
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$|^fb-/);
    expect(payload.game).toBe('bikes-v2');
    expect(payload.text).toBe('cube is lonely');
    expect(payload.message).toBe('cube is lonely');
    expect(payload.build).toBe('abc1234');
    expect(payload.timestamp).toBe('2026-08-16T00:00:00.000Z');
    expect(payload.position).toEqual({ x: 8, y: 6, z: 12 });
    expect(payload.speed).toBe(10);
    expect(payload.snapshot.buildId).toBe('abc1234');
    expect(payload.context.street).toBe('East Jan Avenue');
  });

  it('tags feature ideas as a distinct intent kind', () => {
    const payload = buildFeedbackPayload({
      message: 'add a dirt jump',
      name: 'Alex',
      featureIdea: true,
      snapshot: emptySnapshot(() => '2026-08-16T00:00:00.000Z'),
    });
    expect(payload.kind).toBe(INTENT_KIND.featureIdea);
    expect(payload.featureIdea).toBe(true);
  });

  it('resolves the Asgard swap from VITE_FEEDBACK_URL', () => {
    expect(resolveFeedbackEndpoint({})).toBe('/api/feedback');
    expect(
      resolveFeedbackEndpoint({ VITE_FEEDBACK_URL: 'https://asgard.example/intake/' }),
    ).toBe('https://asgard.example/intake');
  });

  it('formats a readable snapshot line', () => {
    const line = formatSnapshotLine({
      position: { x: 1, y: 2, z: 3 },
      speed: 10,
      street: null,
      lat: null,
      lon: null,
      pressure: 0.5,
      buildId: 'dev',
      at: '2026-08-16T00:00:00.000Z',
    });
    expect(line).toMatch(/36 km\/h/);
    expect(line).toMatch(/xyz 1\.0, 2\.0, 3\.0/);
    expect(line).toMatch(/tires 50%/);
    expect(line).toMatch(/dev/);
  });

  it('rejects short drafts and unnamed feature ideas', () => {
    expect(validateFeedbackDraft({ message: 'hi', name: '', featureIdea: false }).ok).toBe(
      false,
    );
    expect(
      validateFeedbackDraft({ message: 'add a jump', name: '', featureIdea: true }).ok,
    ).toBe(false);
    expect(
      validateFeedbackDraft({ message: 'add a jump', name: 'Alex', featureIdea: true })
        .ok,
    ).toBe(true);
  });

  it('empty snapshot still has a build id and timestamp', () => {
    const snap = emptySnapshot(() => '2026-08-16T12:00:00.000Z');
    expect(snap.buildId.length).toBeGreaterThan(0);
    expect(snap.at).toBe('2026-08-16T12:00:00.000Z');
    expect(snap.position).toBeNull();
  });
});

describe('feedback events', () => {
  it('collects a snapshot from the bus (no system internals)', async () => {
    const bus = createBus();
    const unsub = bindFeedbackSnapshot(bus, () => ({
      position: { x: 1, y: 0, z: 2 },
      speed: 0,
      street: null,
      lat: null,
      lon: null,
      pressure: null,
      buildId: 'test-build',
      at: '2026-08-16T00:00:00.000Z',
    }));
    const snap = await collectSnapshot(bus, 50);
    unsub();
    expect(snap.buildId).toBe('test-build');
    expect(snap.position).toEqual({ x: 1, y: 0, z: 2 });
  });

  it('times out to an empty snapshot when nobody answers', async () => {
    const bus = createBus();
    const snap = await collectSnapshot(bus, 10);
    expect(snap.position).toBeNull();
    expect(snap.buildId.length).toBeGreaterThan(0);
  });

  it('collects a screenshot from the capture event', async () => {
    const bus = createBus();
    const off = bus.on('feedback:capture-request', () => {
      bus.emit('feedback:capture', { dataUrl: 'data:image/jpeg;base64,abcd' });
    });
    const shot = await collectCapture(bus, 50);
    off();
    expect(shot).toMatch(/^data:image\/jpeg/);
  });
});

describe('feedback submit', () => {
  beforeEach(() => {
    mockStorage();
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline');
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists payload locally when the API is down', async () => {
    const payload = buildFeedbackPayload({
      message: 'add a dirt jump by Costco',
      name: 'Alex',
      featureIdea: true,
      snapshot: {
        position: { x: 0, y: 0, z: 0 },
        speed: 5,
        street: 'East Jan Avenue',
        lat: null,
        lon: null,
        pressure: 1,
        buildId: 'dev',
        at: '2026-01-01T00:00:00.000Z',
      },
    });
    const result = await submitFeedback(payload);
    expect(result.ok).toBe(true);
    expect(result.via).toBe('local');
    const saved = JSON.parse(localStorage.getItem(FEEDBACK_STORE_KEY) || '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].message).toMatch(/dirt jump/);
    expect(saved[0].text).toMatch(/dirt jump/);
    expect(saved[0].kind).toBe(INTENT_KIND.featureIdea);
    expect(saved[0].build).toBe('dev');
    expect(saved[0].speed).toBe(5);
  });

  it('POSTs the typed intent to a configured endpoint and drains the stash', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://asgard.example/intake');
      const body = JSON.parse(String(init?.body));
      expect(body.schema).toBe(INTENT_SCHEMA);
      expect(body.kind).toBe(INTENT_KIND.playerFeedback);
      return { ok: true };
    }) as unknown as typeof fetch;
    const payload = buildFeedbackPayload({
      message: 'go faster forever',
      name: '',
      featureIdea: false,
      snapshot: emptySnapshot(() => '2026-01-01T00:00:00.000Z'),
    });
    const result = await submitFeedback(payload, {
      endpoint: 'https://asgard.example/intake',
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(result.via).toBe('api');
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(readStash()).toEqual([]);
  });

  it('surfaces HTTP 400 as failure and does not stash', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 400 })) as unknown as typeof fetch;
    const result = await submitFeedback(
      buildFeedbackPayload({
        message: 'too short after server trim maybe not',
        name: '',
        featureIdea: false,
        snapshot: emptySnapshot(() => '2026-01-01T00:00:00.000Z'),
      }),
      { fetchImpl },
    );
    expect(result.ok).toBe(false);
    expect(result.via).toBe('rejected');
    expect(readStash()).toEqual([]);
  });

  it('flushes stashed notes on boot and drops 4xx leftovers', async () => {
    const offline = await submitFeedback(
      buildFeedbackPayload({
        message: 'save me for later',
        name: 'Sam',
        featureIdea: false,
        snapshot: emptySnapshot(() => '2026-01-01T00:00:00.000Z'),
      }),
    );
    expect(offline.via).toBe('local');
    expect(readStash()).toHaveLength(1);

    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
    const flushed = await flushStashedFeedback({ fetchImpl });
    expect(flushed.sent).toBe(1);
    expect(flushed.left).toBe(0);
    expect(JSON.parse(localStorage.getItem(FEEDBACK_STORE_KEY) || '[]')).toEqual([]);
  });
});

describe('hotkeys + capture helpers', () => {
  it('treats form fields as typing targets', () => {
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('encodes a mock canvas as a jpeg data URL', () => {
    const canvas = {
      width: 16,
      height: 16,
      toDataURL: (type: string, quality: number) => `data:${type};q=${quality};mock`,
    } as unknown as HTMLCanvasElement;
    expect(captureCanvasJpeg(canvas)).toBe('data:image/jpeg;q=0.65;mock');
  });
});
