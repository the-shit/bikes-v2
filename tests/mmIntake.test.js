import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ingestChannelPosts, postToIntent, shouldIngestPost } from '../deploy/mmIntake.mjs';

const dirs = [];

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bikes-v2-mm-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const human = {
  id: 'p1',
  user_id: 'u-jordan',
  message: 'the hop feels floaty on Jan',
  create_at: Date.parse('2026-08-17T00:00:00.000Z'),
  delete_at: 0,
  root_id: '',
  props: {},
};

describe('mattermost → intent', () => {
  it('maps a human post to a typed intent with source=mattermost', () => {
    const intent = postToIntent(human, { username: 'jordan' });
    expect(intent.schema).toBe('bikes.v2.intent');
    expect(intent.source).toBe('mattermost');
    expect(intent.id).toBe('mm-p1');
    expect(intent.text).toMatch(/hop feels floaty/);
    expect(intent.message).toBe(intent.text);
    expect(intent.name).toBe('jordan');
    expect(intent.timestamp).toBe('2026-08-17T00:00:00.000Z');
  });

  it('skips the bot, deploy cards, replies, and empty noise', () => {
    expect(shouldIngestPost(human, { botUserId: 'bot' })).toBe(true);
    expect(shouldIngestPost({ ...human, user_id: 'bot' }, { botUserId: 'bot' })).toBe(
      false,
    );
    expect(
      shouldIngestPost(
        { ...human, props: { bikes_v2: 'deploy-card' } },
        { botUserId: 'bot' },
      ),
    ).toBe(false);
    expect(shouldIngestPost({ ...human, root_id: 'parent' }, { botUserId: 'bot' })).toBe(
      false,
    );
    expect(shouldIngestPost({ ...human, message: ' ' }, { botUserId: 'bot' })).toBe(false);
    expect(
      shouldIngestPost(
        { ...human, message: '#### Pit crew rolled a new build' },
        { botUserId: 'bot' },
      ),
    ).toBe(false);
  });

  it('appends jsonl once per post id', async () => {
    const file = path.join(tmpDir(), 'feedback.jsonl');
    const first = await ingestChannelPosts([human], {
      botUserId: 'bot',
      feedbackFile: file,
      users: { 'u-jordan': 'jordan' },
    });
    const second = await ingestChannelPosts([human], {
      botUserId: 'bot',
      feedbackFile: file,
      users: { 'u-jordan': 'jordan' },
    });
    expect(first.wrote).toBe(1);
    expect(second.wrote).toBe(0);
    const line = JSON.parse(fs.readFileSync(file, 'utf8').trim());
    expect(line.source).toBe('mattermost');
    expect(line.id).toBe('mm-p1');
  });
});
