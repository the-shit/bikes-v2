import { describe, expect, it } from 'vitest';
import {
  collectDeployTitles,
  formatDeployCard,
} from '../deploy/deployCard.mjs';
import { upsertChannelIdLine } from '../deploy/ensureMmChannel.mjs';

describe('deploy card', () => {
  it('formats a campy card with sha, url, and titles', () => {
    const text = formatDeployCard({
      sha: 'deadbeef1234',
      titles: ['feat: F-Widget', 'fix: ram hitstop'],
    });
    expect(text).toMatch(/Pit crew rolled a new build/);
    expect(text).toMatch(/\*\*deadbee\*\* is live/);
    expect(text).toMatch(/ready to test/);
    expect(text).toMatch(/bikes-v2\.jordanpartridge\.us/);
    expect(text).toMatch(/feat: F-Widget/);
    expect(text).toMatch(/F-Widget or type here/);
  });

  it('drops merge commits and de-dupes titles', () => {
    expect(
      collectDeployTitles([
        'Merge pull request #30 from the-shit/feat/todo-540-f-widget',
        'feat: name the F-Widget',
        'feat: name the F-Widget',
        'fix: ram',
      ]),
    ).toEqual(['feat: name the F-Widget', 'fix: ram']);
  });

  it('rewrites MATTERMOST_BIKES_CHANNEL_ID in env text', () => {
    const next = upsertChannelIdLine(
      'MATTERMOST_URL=http://localhost:8065\nMATTERMOST_BIKES_CHANNEL_ID=oldid\n',
      'newid',
    );
    expect(next).toMatch(/MATTERMOST_BIKES_CHANNEL_ID=newid/);
    expect(next).not.toMatch(/oldid/);
  });
});
