#!/usr/bin/env node
/**
 * Poll #bikes-v2 and append human posts to feedback.jsonl (source=mattermost).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonlHasId, appendJsonl } from './jsonl.mjs';
import { loadMattermostEnv, mmConfig, mmEnabled, mmFetch } from './mmClient.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CARD_PROP = 'deploy-card';

export function shouldIngestPost(post, { botUserId } = {}) {
  if (!post || post.delete_at) {
    return false;
  }
  if (botUserId && post.user_id === botUserId) {
    return false;
  }
  if (post.props && post.props.bikes_v2 === CARD_PROP) {
    return false;
  }
  if (post.root_id) {
    return false;
  }
  const msg = String(post.message || '').trim();
  if (msg.length < 2) {
    return false;
  }
  if (/^#{1,6}\s*pit crew rolled/i.test(msg)) {
    return false;
  }
  return true;
}

export function postToIntent(post, { username } = {}) {
  const text = String(post.message || '').trim().slice(0, 2000);
  const created = Number(post.create_at) || Date.now();
  return {
    schema: 'bikes.v2.intent',
    schemaVersion: 1,
    kind: 'player_feedback',
    id: `mm-${post.id}`,
    game: 'bikes-v2',
    source: 'mattermost',
    text,
    message: text,
    name: username || null,
    riderName: username || null,
    featureIdea: false,
    timestamp: new Date(created).toISOString(),
    receivedAt: new Date().toISOString(),
    build: null,
    position: null,
    speed: null,
    context: { source: 'mattermost', postId: post.id },
  };
}

export async function ingestChannelPosts(posts, ctx) {
  let wrote = 0;
  let skipped = 0;
  for (const post of posts) {
    if (!shouldIngestPost(post, ctx)) {
      skipped += 1;
      continue;
    }
    const id = `mm-${post.id}`;
    if (jsonlHasId(ctx.feedbackFile, id)) {
      skipped += 1;
      continue;
    }
    const username = ctx.users?.[post.user_id] || null;
    appendJsonl(ctx.feedbackFile, postToIntent(post, { username }));
    wrote += 1;
  }
  return { wrote, skipped };
}

function readCursor(file) {
  if (!fs.existsSync(file)) {
    return 0;
  }
  const n = Number(fs.readFileSync(file, 'utf8').trim());
  return Number.isFinite(n) ? n : 0;
}

function writeCursor(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${value}\n`);
}

async function runIntake() {
  loadMattermostEnv();
  const cfg = mmConfig();
  if (!mmEnabled(cfg)) {
    console.log('mm intake skipped: mattermost not configured');
    return;
  }
  const project = path.resolve(__dirname, '..');
  const feedbackFile =
    process.env.BIKES_V2_FEEDBACK_FILE || path.join(project, 'feedback.jsonl');
  const cursorFile =
    process.env.BIKES_V2_MM_CURSOR ||
    path.join(process.env.HOME || '.', '.local/state/bikes-v2-deploy/mm-since');
  const since = readCursor(cursorFile);
  const me = await mmFetch(cfg, '/api/v4/users/me');
  const page = await mmFetch(
    cfg,
    `/api/v4/channels/${cfg.channelId}/posts?since=${since}&per_page=60`,
  );
  const posts = Object.values(page.posts || {});
  const userIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))];
  let users = {};
  if (userIds.length) {
    const listed = await mmFetch(cfg, '/api/v4/users/ids', {
      method: 'POST',
      body: JSON.stringify(userIds),
    });
    for (const u of listed) {
      users[u.id] = u.username || u.nickname || null;
    }
  }
  const result = await ingestChannelPosts(posts, {
    botUserId: me.id,
    feedbackFile,
    users,
  });
  const newest = posts.reduce((m, p) => Math.max(m, Number(p.create_at) || 0), since);
  if (newest > since) {
    writeCursor(cursorFile, newest);
  }
  console.log(`mm intake wrote=${result.wrote} skipped=${result.skipped}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runIntake().catch((err) => {
    console.error('mm intake failed', err.message);
    process.exit(1);
  });
}
