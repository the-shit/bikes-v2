import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, ensureFarmSiblings, safeJoin } from '../deploy/server.mjs';

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

  it('copies missing farm siblings from a src deploy dir', () => {
    const live = tmpDir();
    const src = tmpDir();
    fs.writeFileSync(path.join(src, 'feedbackFarm.mjs'), 'export default 1\n');
    fs.writeFileSync(path.join(src, 'feedbackFormat.mjs'), 'export default 2\n');
    const copied = ensureFarmSiblings(live, src);
    expect(copied).toEqual(['feedbackFarm.mjs', 'feedbackFormat.mjs']);
    expect(fs.existsSync(path.join(live, 'feedbackFarm.mjs'))).toBe(true);
    expect(ensureFarmSiblings(live, src)).toEqual([]);
  });
});

describe('POST /api/feedback', () => {
  it('writes jsonl and serves the screenshot', async () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    const farm = {
      enabled: { mattermost: false, github: false, repo: 'the-shit/bikes-v2' },
      createGitHubIssue: async () => ({ ok: false, skipped: true }),
      postToMattermost: async () => ({ ok: false, skipped: true }),
    };
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      publicUrl: 'http://127.0.0.1',
      farm,
    });
    const port = await listen(server);
    try {
      const raw = Buffer.from('shot-bytes').toString('base64');
      const res = await fetch(`http://127.0.0.1:${port}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'empty scene needs a bike',
          build: 'testsha',
          screenshot: `data:image/jpeg;base64,${raw}`,
        }),
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

  it('rejects path-escape screenshot names', async () => {
    const dir = tmpDir();
    const server = createServer(dir, {
      feedbackFile: path.join(dir, 'feedback.jsonl'),
      screenshotsDir: path.join(dir, 'shots'),
      farm: {
        enabled: { mattermost: false, github: false, repo: 'x' },
        createGitHubIssue: async () => ({ ok: false, skipped: true }),
        postToMattermost: async () => ({ ok: false, skipped: true }),
      },
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
