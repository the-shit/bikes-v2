/**
 * Mattermost REST helpers. Secrets stay in env / .env.mattermost.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from './feedbackFarm.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadMattermostEnv(project = path.resolve(__dirname, '..')) {
  loadEnvFile(path.join(project, '.env.mattermost'));
  loadEnvFile(path.join(project, '.env'));
  loadEnvFile(path.join(project, '..', 'bikes', '.env.mattermost'));
}

export function mmConfig(env = process.env) {
  return {
    url: String(env.MATTERMOST_URL || '').replace(/\/$/, ''),
    token: env.MATTERMOST_BOT_TOKEN || '',
    channelId: env.MATTERMOST_BIKES_CHANNEL_ID || '',
  };
}

export function mmEnabled(cfg) {
  return Boolean(cfg.url && cfg.token && cfg.channelId);
}

export async function mmFetch(cfg, apiPath, opts = {}, fetchImpl = fetch) {
  const res = await fetchImpl(`${cfg.url}${apiPath}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function mmPost(cfg, message, props = {}, fetchImpl = fetch) {
  return mmFetch(
    cfg,
    '/api/v4/posts',
    {
      method: 'POST',
      body: JSON.stringify({
        channel_id: cfg.channelId,
        message,
        props,
      }),
    },
    fetchImpl,
  );
}
