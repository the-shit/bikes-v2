import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  formatGitHubIssue,
  formatMattermostMessage,
  shouldFileGitHubIssue,
} from '../deploy/feedbackFormat.mjs';
import {
  createFeedbackFarm,
  decodeScreenshotDataUrl,
  ingestFeedback,
  saveScreenshot,
} from '../deploy/feedbackFarm.mjs';

const dirs = [];

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bikes-v2-fb-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('GitHub / Mattermost farm format', () => {
  it('builds titled issue with labels for feature ideas', () => {
    const { title, body, labels } = formatGitHubIssue({
      name: 'Alex',
      featureIdea: true,
      message: 'Add a dirt jump by evil Costco',
      build: 'abc1234',
      context: { street: 'East Jan Avenue', speed: 10, position: { x: 1, y: 0, z: 2 } },
      receivedAt: '2026-08-16T00:00:00.000Z',
    });
    expect(title.startsWith('[idea]')).toBe(true);
    expect(title).toMatch(/dirt jump/i);
    expect(labels).toContain('player-feedback');
    expect(labels).toContain('feature-idea');
    expect(body).toMatch(/Alex/);
    expect(body).toMatch(/credit if shipped/);
    expect(body).toMatch(/East Jan Avenue/);
    expect(body).toMatch(/abc1234/);
    expect(body).toMatch(/bikes-v2\.jordanpartridge\.us/);
  });

  it('tags bug-ish feedback', () => {
    const { labels, title } = formatGitHubIssue({
      message: 'game crash when I open feedback',
      featureIdea: false,
    });
    expect(title.startsWith('[feedback]')).toBe(true);
    expect(labels).toContain('bug');
  });

  it('embeds a screenshot URL when present', () => {
    const { body } = formatGitHubIssue({
      message: 'look at this cube',
      screenshotUrl: 'https://bikes-v2.jordanpartridge.us/api/feedback/screenshots/x.jpg',
    });
    expect(body).toMatch(/!\[ride\]/);
  });

  it('filters smoke noise from the farm', () => {
    expect(shouldFileGitHubIssue({ message: 'Mattermost channel smoke — x' })).toBe(
      false,
    );
    expect(shouldFileGitHubIssue({ message: 'real player idea please' })).toBe(true);
  });

  it('Mattermost format can include issue link', () => {
    const text = formatMattermostMessage(
      { name: 'Sam', message: 'hello farm', build: 'dev' },
      { number: 42, html_url: 'https://github.com/the-shit/bikes-v2/issues/42' },
    );
    expect(text).toMatch(/Bikes v2 feedback/);
    expect(text).toMatch(/#42/);
    expect(text).toMatch(/github\.com\/the-shit\/bikes-v2\/issues\/42/);
  });
});

describe('screenshot + ingest', () => {
  it('decodes a jpeg data URL and rejects junk', () => {
    const raw = Buffer.from('hello-shot').toString('base64');
    const decoded = decodeScreenshotDataUrl(`data:image/jpeg;base64,${raw}`);
    expect(decoded?.buffer.toString()).toBe('hello-shot');
    expect(decodeScreenshotDataUrl('not-a-data-url')).toBeNull();
    expect(decodeScreenshotDataUrl('data:text/plain;base64,abcd')).toBeNull();
  });

  it('writes screenshot bytes beside jsonl, never the data URL', async () => {
    const dir = tmpDir();
    const shots = path.join(dir, 'screenshots');
    const file = path.join(dir, 'feedback.jsonl');
    const raw = Buffer.from('tiny-jpeg').toString('base64');
    const farm = createFeedbackFarm({
      env: {},
      fetchImpl: async () => {
        throw new Error('should not fetch');
      },
    });
    const result = await ingestFeedback(
      {
        message: 'the cube should spin the other way',
        name: 'Jordan',
        build: 'deadbeef',
        timestamp: '2026-08-16T00:00:00.000Z',
        speed: 0,
        position: { x: 8, y: 6, z: 12 },
        context: { position: { x: 8, y: 6, z: 12 }, speed: 0, buildId: 'deadbeef' },
        screenshot: `data:image/jpeg;base64,${raw}`,
      },
      {
        ip: '127.0.0.1',
        feedbackFile: file,
        screenshotsDir: shots,
        publicUrl: 'https://bikes-v2.jordanpartridge.us',
        farm,
      },
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.screenshot).toMatch(/^screenshots\/.+\.jpg$/);
    const line = JSON.parse(fs.readFileSync(file, 'utf8').trim());
    expect(line.message).toMatch(/cube/);
    expect(line.build).toBe('deadbeef');
    expect(line.position).toEqual({ x: 8, y: 6, z: 12 });
    expect(line.screenshot).toBeUndefined();
    expect(line.screenshotPath).toMatch(/^screenshots\//);
    expect(line.screenshotUrl).toMatch(/\/api\/feedback\/screenshots\//);
    const shotFile = path.join(dir, line.screenshotPath);
    expect(fs.readFileSync(shotFile, 'utf8')).toBe('tiny-jpeg');
  });

  it('files GitHub first then Mattermost with the issue link', async () => {
    const dir = tmpDir();
    const posts = [];
    const farm = createFeedbackFarm({
      env: {
        GITHUB_TOKEN: 'ghs_test',
        GITHUB_REPO: 'the-shit/bikes-v2',
        MATTERMOST_URL: 'https://mm.example',
        MATTERMOST_BOT_TOKEN: 'tok',
        MATTERMOST_BIKES_CHANNEL_ID: 'chan',
      },
      fetchImpl: async (url, init) => {
        posts.push({ url: String(url), body: JSON.parse(init.body) });
        if (String(url).includes('github.com')) {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              number: 7,
              html_url: 'https://github.com/the-shit/bikes-v2/issues/7',
              id: 1,
            }),
          };
        }
        return { ok: true, status: 201, json: async () => ({ id: 'mm1' }) };
      },
    });
    const result = await ingestFeedback(
      { message: 'please add trees already', name: 'Sam' },
      {
        feedbackFile: path.join(dir, 'feedback.jsonl'),
        screenshotsDir: path.join(dir, 'shots'),
        publicUrl: 'https://bikes-v2.jordanpartridge.us',
        farm,
      },
    );
    expect(result.body.github.number).toBe(7);
    expect(posts[0].url).toMatch(/api\.github\.com\/repos\/the-shit\/bikes-v2\/issues/);
    expect(posts[1].url).toMatch(/mm\.example\/api\/v4\/posts/);
    expect(posts[1].body.message).toMatch(/#7/);
    const line = JSON.parse(
      fs.readFileSync(path.join(dir, 'feedback.jsonl'), 'utf8').trim(),
    );
    expect(line.githubIssue).toBe(7);
    expect(line.githubUrl).toMatch(/issues\/7/);
  });

  it('rejects a missing message', async () => {
    const dir = tmpDir();
    const result = await ingestFeedback(
      { message: ' ' },
      {
        feedbackFile: path.join(dir, 'feedback.jsonl'),
        screenshotsDir: path.join(dir, 'shots'),
        farm: createFeedbackFarm({ env: {} }),
      },
    );
    expect(result.status).toBe(400);
    expect(fs.existsSync(path.join(dir, 'feedback.jsonl'))).toBe(false);
  });

  it('saveScreenshot writes a uuid-named jpeg', () => {
    const dir = tmpDir();
    const raw = Buffer.from('abc').toString('base64');
    const name = saveScreenshot(`data:image/jpeg;base64,${raw}`, dir);
    expect(name).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(fs.readFileSync(path.join(dir, name), 'utf8')).toBe('abc');
  });
});
