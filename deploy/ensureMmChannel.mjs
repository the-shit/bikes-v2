#!/usr/bin/env node
/**
 * Idempotent: find or create public #bikes-v2 and optionally write its id to env.
 * Never prints tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from './feedbackFarm.mjs';
import { loadMattermostEnv, mmConfig, mmFetch } from './mmClient.mjs';

export const CHANNEL_NAME = 'bikes-v2';

export function upsertChannelIdLine(text, id) {
  const line = `MATTERMOST_BIKES_CHANNEL_ID=${id}`;
  if (/^MATTERMOST_BIKES_CHANNEL_ID=/m.test(text)) {
    return text.replace(/^MATTERMOST_BIKES_CHANNEL_ID=.*$/m, line);
  }
  const trimmed = text.endsWith('\n') || text.length === 0 ? text : `${text}\n`;
  return `${trimmed}${line}\n`;
}

async function resolveTeamId(cfg, existingId) {
  if (existingId) {
    try {
      const ch = await mmFetch(cfg, `/api/v4/channels/${existingId}`);
      if (ch.team_id) {
        return ch.team_id;
      }
    } catch {
      /* old id may be stale */
    }
  }
  const teams = await mmFetch(cfg, '/api/v4/users/me/teams');
  if (!Array.isArray(teams) || teams.length === 0) {
    throw new Error('bot has no teams');
  }
  return teams[0].id;
}

export async function ensureBikesV2Channel(cfg, fetchImpl) {
  const teamId = await resolveTeamId(cfg, cfg.channelId);
  try {
    const existing = await mmFetch(
      cfg,
      `/api/v4/teams/${teamId}/channels/name/${CHANNEL_NAME}`,
      {},
      fetchImpl,
    );
    return { id: existing.id, created: false, teamId };
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }
  const created = await mmFetch(
    cfg,
    '/api/v4/channels',
    {
      method: 'POST',
      body: JSON.stringify({
        team_id: teamId,
        name: CHANNEL_NAME,
        display_name: 'bikes-v2',
        type: 'O',
        purpose: 'Bikes v2 pit crew — deploys, decisions, F-bombs',
      }),
    },
    fetchImpl,
  );
  return { id: created.id, created: true, teamId };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const writeEnv = process.argv.includes('--write-env');
  const envPath = path.resolve(
    process.argv.includes('--env')
      ? process.argv[process.argv.indexOf('--env') + 1]
      : path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '.env.mattermost'),
  );
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
  }
  loadMattermostEnv();
  const cfg = mmConfig();
  if (!cfg.url || !cfg.token) {
    console.error('mattermost url/token missing');
    process.exit(1);
  }
  ensureBikesV2Channel(cfg)
    .then((result) => {
      console.log(
        `channel #${CHANNEL_NAME} ${result.created ? 'created' : 'exists'} id_len=${String(result.id).length}`,
      );
      if (writeEnv) {
        const prev = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        fs.writeFileSync(envPath, upsertChannelIdLine(prev, result.id));
        console.log(`wrote channel id to env file (${path.basename(envPath)})`);
      }
    })
    .catch((err) => {
      console.error('ensure channel failed', err.message);
      process.exit(1);
    });
}
