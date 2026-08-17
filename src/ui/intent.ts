/**
 * Ownership: typed player-feedback intent (Asgard-shaped).
 * Interim POST goes to odin /api/feedback; swap via VITE_FEEDBACK_URL.
 * Budget: keep this file under ~300 lines.
 */

import type { RideSnapshot } from './snapshot';

export const INTENT_SCHEMA = 'bikes.v2.intent';
export const INTENT_SCHEMA_VERSION = 1;
export const INTENT_GAME = 'bikes-v2';
export const DEFAULT_FEEDBACK_URL = '/api/feedback';

export const INTENT_KIND = {
  playerFeedback: 'player_feedback',
  featureIdea: 'feature_idea',
} as const;

export type IntentKind = (typeof INTENT_KIND)[keyof typeof INTENT_KIND];

export type FeedbackIntent = {
  schema: typeof INTENT_SCHEMA;
  schemaVersion: typeof INTENT_SCHEMA_VERSION;
  kind: IntentKind;
  id: string;
  game: typeof INTENT_GAME;
  text: string;
  riderName: string | null;
  sentAt: string;
  build: string;
  snapshot: RideSnapshot;
  client: { href: string; ua: string };
  screenshot?: string;
  /** v1 aliases so the odin farm + playtest-triage keep working. */
  message: string;
  name: string | null;
  featureIdea: boolean;
  timestamp: string;
  position: RideSnapshot['position'];
  speed: number | null;
  context: RideSnapshot;
};

export function newIntentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveFeedbackEndpoint(
  env: { VITE_FEEDBACK_URL?: string } = import.meta.env,
): string {
  const raw = env.VITE_FEEDBACK_URL;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  return DEFAULT_FEEDBACK_URL;
}

export function buildFeedbackIntent(input: {
  message: string;
  name: string;
  featureIdea: boolean;
  snapshot: RideSnapshot;
  screenshot?: string | null;
  href?: string;
  ua?: string;
  id?: string;
}): FeedbackIntent {
  const text = input.message.trim().slice(0, 2000);
  const riderName = input.name.trim().slice(0, 32) || null;
  const featureIdea = Boolean(input.featureIdea);
  const snap = input.snapshot;
  const intent: FeedbackIntent = {
    schema: INTENT_SCHEMA,
    schemaVersion: INTENT_SCHEMA_VERSION,
    kind: featureIdea ? INTENT_KIND.featureIdea : INTENT_KIND.playerFeedback,
    id: input.id ?? newIntentId(),
    game: INTENT_GAME,
    text,
    riderName,
    sentAt: snap.at,
    build: snap.buildId,
    snapshot: snap,
    client: {
      href: input.href ?? '',
      ua: input.ua ?? '',
    },
    message: text,
    name: riderName,
    featureIdea,
    timestamp: snap.at,
    position: snap.position,
    speed: snap.speed,
    context: snap,
  };
  if (input.screenshot) {
    intent.screenshot = input.screenshot;
  }
  return intent;
}
