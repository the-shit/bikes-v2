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
  opts: { endpoint?: string; fetchImpl?: typeof fetch } = {},
): Promise<SubmitResult> {
  persistLocal(payload);

  const endpoint = opts.endpoint ?? resolveFeedbackEndpoint();
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  try {
    const res = await fetchImpl(endpoint, {
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
