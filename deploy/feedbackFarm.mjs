/**
 * Feedback farm: jsonl + screenshot files + GitHub issue + Mattermost.
 * Server-only. Secrets stay in env / .env.mattermost (not in git).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  formatGitHubIssue,
  formatMattermostMessage,
  shouldFileGitHubIssue,
} from './feedbackFormat.mjs';

export { PUBLIC_URL_DEFAULT } from './feedbackFormat.mjs';
export const MAX_SCREENSHOT_BYTES = 1_500_000;
const DATA_URL_RE =
  /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) {
      continue;
    }
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === '') {
      process.env[k] = v;
    }
  }
}

export function decodeScreenshotDataUrl(dataUrl) {
  const m = DATA_URL_RE.exec(String(dataUrl || ''));
  if (!m) {
    return null;
  }
  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length || buffer.length > MAX_SCREENSHOT_BYTES) {
    return null;
  }
  return { mime, buffer };
}

export function saveScreenshot(dataUrl, screenshotsDir) {
  const decoded = decodeScreenshotDataUrl(dataUrl);
  if (!decoded) {
    return null;
  }
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const ext =
    decoded.mime === 'image/png'
      ? 'png'
      : decoded.mime === 'image/webp'
        ? 'webp'
        : 'jpg';
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(screenshotsDir, name), decoded.buffer);
  return name;
}

function pickRecord(data, ip) {
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 32) : '';
  const context =
    data.context && typeof data.context === 'object' ? data.context : {};
  return {
    message: String(data.message).slice(0, 2000),
    name: name || null,
    featureIdea: Boolean(data.featureIdea),
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : null,
    build: typeof data.build === 'string' ? data.build.slice(0, 64) : null,
    position: data.position && typeof data.position === 'object' ? data.position : null,
    speed: typeof data.speed === 'number' ? data.speed : null,
    href: typeof data.href === 'string' ? data.href.slice(0, 500) : null,
    ua: typeof data.ua === 'string' ? data.ua.slice(0, 300) : null,
    context,
    receivedAt: new Date().toISOString(),
    ip: ip || null,
  };
}

export function createFeedbackFarm({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const mmUrl = (env.MATTERMOST_URL || '').replace(/\/$/, '');
  const mmToken = env.MATTERMOST_BOT_TOKEN || '';
  const mmChannel = env.MATTERMOST_BIKES_CHANNEL_ID || '';
  const mmEnabled = Boolean(mmUrl && mmToken && mmChannel);
  const ghToken = env.GITHUB_TOKEN || env.GH_TOKEN || '';
  const ghRepo = env.GITHUB_REPO || 'the-shit/bikes-v2';
  const ghEnabled = Boolean(ghToken && ghRepo);

  async function createGitHubIssue(data) {
    if (!ghEnabled) {
      return { ok: false, skipped: true, error: 'github not configured' };
    }
    if (!shouldFileGitHubIssue(data)) {
      return { ok: false, skipped: true, error: 'filtered' };
    }
    const { title, body, labels } = formatGitHubIssue(data);
    const headers = {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'BikesV2-feedback-farm',
      'Content-Type': 'application/json',
    };
    try {
      let res = await fetchImpl(`https://api.github.com/repos/${ghRepo}/issues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, body, labels }),
      });
      let json = await res.json().catch(() => ({}));
      if (res.status === 422 && labels.length) {
        res = await fetchImpl(`https://api.github.com/repos/${ghRepo}/issues`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, body }),
        });
        json = await res.json().catch(() => ({}));
      }
      if (!res.ok) {
        return { ok: false, error: json.message || `HTTP ${res.status}` };
      }
      return { ok: true, number: json.number, html_url: json.html_url, id: json.id };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  async function postToMattermost(data, issue = null) {
    if (!mmEnabled) {
      return { ok: false, skipped: true, error: 'mattermost not configured' };
    }
    try {
      const res = await fetchImpl(`${mmUrl}/api/v4/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: mmChannel,
          message: formatMattermostMessage(data, issue),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: json.message || `HTTP ${res.status}` };
      }
      return { ok: true, id: json.id };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  return {
    enabled: { mattermost: mmEnabled, github: ghEnabled, repo: ghRepo },
    createGitHubIssue,
    postToMattermost,
  };
}

export async function ingestFeedback(data, ctx) {
  if (!data || typeof data.message !== 'string' || data.message.trim().length < 2) {
    return { status: 400, body: { ok: false, error: 'message required' } };
  }

  const record = pickRecord(data, ctx.ip);
  if (typeof data.screenshot === 'string') {
    const name = saveScreenshot(data.screenshot, ctx.screenshotsDir);
    if (name) {
      record.screenshotPath = `screenshots/${name}`;
      const base = String(ctx.publicUrl || '').replace(/\/$/, '');
      record.screenshotUrl = base
        ? `${base}/api/feedback/screenshots/${name}`
        : null;
    }
  }

  const farm = ctx.farm;
  const gh = farm
    ? await farm.createGitHubIssue(record)
    : { ok: false, skipped: true };
  if (!gh.ok && !gh.skipped) {
    console.error('github issue failed', gh.error);
  }
  if (gh.ok) {
    record.githubIssue = gh.number;
    record.githubUrl = gh.html_url;
  }

  fs.mkdirSync(path.dirname(ctx.feedbackFile), { recursive: true });
  fs.appendFileSync(ctx.feedbackFile, `${JSON.stringify(record)}\n`, 'utf8');

  const mm = farm
    ? await farm.postToMattermost(
        record,
        gh.ok ? { number: gh.number, html_url: gh.html_url } : null,
      )
    : { ok: false, skipped: true };
  if (!mm.ok && !mm.skipped) {
    console.error('mattermost post failed', mm.error);
  }

  return {
    status: 200,
    body: {
      ok: true,
      mattermost: mm.ok ? 'posted' : mm.skipped ? 'skipped' : 'failed',
      github: gh.ok
        ? { number: gh.number, url: gh.html_url }
        : gh.skipped
          ? 'skipped'
          : 'failed',
      screenshot: record.screenshotPath || null,
    },
  };
}
