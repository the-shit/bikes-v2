import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, safeJoin } from '../deploy/server.mjs';
import { createRateLimiter } from '../deploy/rateLimit.mjs';

const ROOT = path.resolve('/tmp/bikes-v2-dist');
const dirs = [];

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bikes-v2-srv-'));
  dirs.push(dir);
  return dir;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function typedIntent(overrides = {}) {
  return {
    schema: 'bikes.v2.intent',
    schemaVersion: 1,
    kind: 'player_feedback',
    id: '11111111-1111-1111-1111-111111111111',
    game: 'bikes-v2',
    text: 'empty scene needs a bike',
    message: 'empty scene needs a bike',
    build: 'testsha',
    ...overrides,
  };
}

function stubFarm() {
  return {
    enabled: { mattermost: false, github: false, repo: 'the-shit/bikes-v2' },
    createGitHubIssue: async () => ({ ok: false, skipped: true }),
    postToMattermost: async () => ({ ok: false, skipped: true }),
  };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('safeJoin', () => {
  it('serves files under root', () => {
    expect(safeJoin(ROOT, '/index.html')).toBe(path.join(ROOT, 'index.html'));
  });

  it('rejects parent-directory escapes', () => {
    expect(safeJoin(ROOT, '/../etc/passwd')).toBeNull();
  });
});

describe('rate limiter', () => {
  it('allows up to max then rejects', () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
    expect(limiter.allow('1.1.1.1')).toBe(true);
    expect(limiter.allow('1.1.1.1')).toBe(true);
    expect(limiter.allow('1.1.1.1')).toBe(false);
    expect(limiter.allow('2.2.2.2')).toBe(true);
    t = 2000;
    expect(limiter.allow('1.1.1.1')).toBe(true);
  });
});

describe('POST /api/feedback', () => {
  it('writes jsonl and serves the screenshot', async () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      publicUrl: 'http://127.0.0.1',
      farm: stubFarm(),
    });
    const port = await listen(server);
    try {
      const raw = Buffer.from('shot-bytes').toString('base64');
      const res = await fetch(`http://127.0.0.1:${port}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          typedIntent({ screenshot: `data:image/jpeg;base64,${raw}` }),
        ),
      });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.screenshot).toMatch(/^screenshots\//);
      const line = JSON.parse(fs.readFileSync(path.join(dir, 'feedback.jsonl'), 'utf8').trim());
      expect(line.build).toBe('testsha');
      const name = path.basename(line.screenshotPath);
      const shot = await fetch(`http://127.0.0.1:${port}/api/feedback/screenshots/${name}`);
      expect(shot.status).toBe(200);
      expect(await shot.text()).toBe('shot-bytes');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects untyped payloads and rate-limits repeats', async () => {
    const dir = tmpDir();
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      farm: stubFarm(),
      rateLimiter: createRateLimiter({ windowMs: 60_000, max: 2 }),
    });
    const port = await listen(server);
    try {
      const bad = await fetch(`http://127.0.0.1:${port}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'no schema' }),
      });
      expect(bad.status).toBe(400);
      expect((await bad.json()).error).toMatch(/typed intent/);

      const ok = await fetch(`http://127.0.0.1:${port}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typedIntent()),
      });
      expect(ok.status).toBe(200);

      const limited = await fetch(`http://127.0.0.1:${port}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typedIntent({ id: '22222222-2222-2222-2222-222222222222' })),
      });
      expect(limited.status).toBe(429);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('health endpoints do not leak filesystem paths', async () => {
    const dir = tmpDir();
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      farm: stubFarm(),
    });
    const port = await listen(server);
    try {
      const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
      const fb = await (await fetch(`http://127.0.0.1:${port}/api/feedback/health`)).json();
      const blob = JSON.stringify({ health, fb });
      expect(health.ok).toBe(true);
      expect(fb.ok).toBe(true);
      expect(typeof fb.mattermost).toBe('boolean');
      expect(typeof fb.github).toBe('boolean');
      expect(blob).not.toMatch(/feedback\.jsonl|\/Users\/|\/tmp\/|screenshotsDir|Sites\//);
      expect(health.root).toBeUndefined();
      expect(fb.file).toBeUndefined();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects path-escape screenshot names', async () => {
    const dir = tmpDir();
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      farm: stubFarm(),
    });
    const port = await listen(server);
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/feedback/screenshots/../server.mjs`,
      );
      expect(res.status).toBe(404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
