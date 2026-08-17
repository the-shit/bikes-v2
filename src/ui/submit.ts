/**
 * Ownership: POST typed feedback intent, with localStorage fallback.
 * Talks via: payload only. Endpoint from VITE_FEEDBACK_URL (Asgard later).
 * Budget: keep this file under ~300 lines.
 */

import {
  buildFeedbackIntent,
  resolveFeedbackEndpoint,
  type FeedbackIntent,
} from './intent';
import type { RideSnapshot } from './snapshot';

export const FEEDBACK_STORE_KEY = 'bikes-v2-feedback';
export const PLAYER_NAME_KEY = 'bikes-v2-player-name';

export type FeedbackPayload = FeedbackIntent;

export type SubmitResult = {
  ok: boolean;
  via: 'api' | 'local' | 'rejected';
  error?: string;
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
    return { ok: false, error: 'Give us a little more juice…' };
  }
  if (input.featureIdea && name.length < 1) {
    return { ok: false, error: 'Need a handle to hang on the idea' };
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
  id?: string;
}): FeedbackPayload {
  return buildFeedbackIntent(input);
}

export function readStash(): FeedbackPayload[] {
  try {
    const prev = JSON.parse(
      localStorage.getItem(FEEDBACK_STORE_KEY) || '[]',
    ) as FeedbackPayload[];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return [];
  }
}

function writeStash(items: FeedbackPayload[]): void {
  try {
    localStorage.setItem(FEEDBACK_STORE_KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* quota */
  }
}

function stashPayload(payload: FeedbackPayload): void {
  const rest = { ...payload };
  delete rest.screenshot;
  writeStash(readStash().filter((item) => item.id !== rest.id).concat(rest));
}

function unstashId(id: string): void {
  writeStash(readStash().filter((item) => item.id !== id));
}

export async function submitFeedback(
  payload: FeedbackPayload,
  opts: { endpoint?: string; fetchImpl?: typeof fetch } = {},
): Promise<SubmitResult> {
  const endpoint = opts.endpoint ?? resolveFeedbackEndpoint();
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      unstashId(payload.id);
      return { ok: true, via: 'api' };
    }
    if (res.status >= 500) {
      stashPayload(payload);
    }
    return { ok: false, via: 'rejected', error: `HTTP ${res.status}` };
  } catch {
    stashPayload(payload);
    return { ok: true, via: 'local' };
  }
}

export async function flushStashedFeedback(
  opts: { endpoint?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ sent: number; left: number }> {
  const endpoint = opts.endpoint ?? resolveFeedbackEndpoint();
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const items = readStash();
  if (items.length === 0) {
    return { sent: 0, left: 0 };
  }
  const left: FeedbackPayload[] = [];
  let sent = 0;
  for (const item of items) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        sent += 1;
      } else if (res.status >= 500) {
        left.push(item);
      }
    } catch {
      left.push(item);
    }
  }
  writeStash(left);
  return { sent, left: left.length };
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
