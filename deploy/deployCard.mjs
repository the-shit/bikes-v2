#!/usr/bin/env node
/**
 * Format + post a #bikes-v2 deploy card after a live sha lands.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMattermostEnv, mmConfig, mmEnabled, mmPost } from './mmClient.mjs';

export const LIVE_URL = 'https://bikes-v2.jordanpartridge.us';
export const CARD_PROP = 'deploy-card';

export function collectDeployTitles(subjects) {
  const seen = new Set();
  const out = [];
  for (const raw of subjects) {
    const title = String(raw || '').trim();
    if (!title || /^merge /i.test(title)) {
      continue;
    }
    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(title);
    if (out.length >= 12) {
      break;
    }
  }
  return out;
}

export function formatDeployCard({ sha, titles = [], url = LIVE_URL }) {
  const short = String(sha || 'dev').slice(0, 7);
  const lines = [
    `#### Pit crew rolled a new build`,
    `**${short}** is live — ready to test`,
    url,
  ];
  if (titles.length) {
    lines.push('', 'What just hit the street:');
    for (const title of titles) {
      lines.push(`- ${title}`);
    }
  }
  lines.push('', `_Drop an F-bomb in the F-Widget or type here — we read both._`);
  return lines.join('\n');
}

export function deployCardProps() {
  return { bikes_v2: CARD_PROP };
}

export function gitSubjects(repo, fromSha, toSha) {
  if (!fromSha || fromSha === 'none' || !/^[0-9a-f]{7,40}$/i.test(fromSha)) {
    const one = spawnSync('git', ['-C', repo, 'log', '-1', '--format=%s', toSha || 'HEAD'], {
      encoding: 'utf8',
    });
    return one.status === 0 ? [one.stdout.trim()] : [];
  }
  const range = `${fromSha}..${toSha || 'HEAD'}`;
  const res = spawnSync('git', ['-C', repo, 'log', '--format=%s', range], {
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    return [];
  }
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  loadMattermostEnv();
  const args = process.argv.slice(2);
  const take = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : '';
  };
  const fromSha = take('--from');
  const toSha = take('--to') || 'HEAD';
  const repo = take('--repo') || process.cwd();
  const cfg = mmConfig();
  if (!mmEnabled(cfg)) {
    console.log('deploy card skipped: mattermost not configured');
    process.exit(0);
  }
  const titles = collectDeployTitles(gitSubjects(repo, fromSha, toSha));
  const message = formatDeployCard({ sha: toSha, titles });
  mmPost(cfg, message, deployCardProps())
    .then((post) => {
      console.log(`deploy card posted ${post.id || 'ok'}`);
    })
    .catch((err) => {
      console.error('deploy card failed', err.message);
      process.exit(1);
    });
}
