/**
 * Ownership: serialize + POST /api/feedback, with localStorage fallback.
 * Talks via: payload only. Do not import bike/world.
 * Budget: keep this file under ~300 lines.
 */

import type { RideSnapshot } from './snapshot';

export const FEEDBACK_STORE_KEY = 'bikes-v2-feedback';
export const PLAYER_NAME_KEY = 'bikes-v2-player-name';

export type FeedbackPayload = {
  message: string;
  name: string | null;
  featureIdea: boolean;
  timestamp: string;
  build: string;
  position: RideSnapshot['position'];
  speed: number | null;
  href: string;
  ua: string;
  context: {
    position: RideSnapshot['position'];
    speed: number | null;
    street: string | null;
    lat: number | null;
    lon: number | null;
    pressure: number | null;
    buildId: string;
  };
  screenshot?: string;
};

export type SubmitResult = {
  ok: boolean;
  via: 'api' | 'local';
};

export type DraftCheck = {
  ok: boolean;
  error?: string;
};

export function validateFeedbackDraft(input: {
  message: string;
  name: string;
  featureIdea: boolean;
}): DraftCheck {
  const message = input.message.trim();
  const name = input.name.trim();
  if (message.length < 3) {
    return { ok: false, error: 'Say a bit more…' };
  }
  if (input.featureIdea && name.length < 1) {
    return { ok: false, error: 'Add a name to claim credit' };
  }
  return { ok: true };
}

export function buildFeedbackPayload(input: {
  message: string;
  name: string;
  featureIdea: boolean;
  snapshot: RideSnapshot;
  screenshot?: string | null;
  href?: string;
  ua?: string;
}): FeedbackPayload {
  const name = input.name.trim().slice(0, 32) || null;
  const snap = input.snapshot;
  const payload: FeedbackPayload = {
    message: input.message.trim().slice(0, 2000),
    name,
    featureIdea: Boolean(input.featureIdea),
    timestamp: snap.at,
    build: snap.buildId,
    position: snap.position,
    speed: snap.speed,
    href: input.href ?? '',
    ua: input.ua ?? '',
    context: {
      position: snap.position,
      speed: snap.speed,
      street: snap.street,
      lat: snap.lat,
      lon: snap.lon,
      pressure: snap.pressure,
      buildId: snap.buildId,
    },
  };
  if (input.screenshot) {
    payload.screenshot = input.screenshot;
  }
  return payload;
}

function persistLocal(payload: FeedbackPayload): void {
  try {
    const prev = JSON.parse(
      localStorage.getItem(FEEDBACK_STORE_KEY) || '[]',
    ) as FeedbackPayload[];
    const next = Array.isArray(prev) ? prev : [];
    const rest = { ...payload };
    delete rest.screenshot;
    next.push(rest);
    localStorage.setItem(FEEDBACK_STORE_KEY, JSON.stringify(next.slice(-50)));
  } catch {
    /* quota / missing storage */
  }
}

export async function submitFeedback(
  payload: FeedbackPayload,
): Promise<SubmitResult> {
  persistLocal(payload);

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { ok: true, via: 'api' };
    }
  } catch {
    /* offline / vite-dev without the farm */
  }

  return { ok: true, via: 'local' };
}

export function getStoredPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function storePlayerName(name: string): void {
  try {
    if (name) {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }
  } catch {
    /* ignore */
  }
}
