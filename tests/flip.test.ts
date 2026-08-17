import { describe, expect, it } from 'vitest';
import {
  beginFlip,
  createFlip,
  createFlipped,
  FLIP,
  stepFlip,
  zombiesEnabled,
} from '../src/world/flip';
import { flipSkin } from '../src/world/skin';
import { createStory, stepWorldStory } from '../src/world/story';

const DT = 1 / 60;
const idle = {
  speed: 0,
  steer: 0,
  hop: false,
  airborne: false,
  atCharge: false,
  dx: 0,
  dz: 0,
};

describe('flip state machine', () => {
  it('starts pre and does not enable zombies', () => {
    const flip = createFlip();
    expect(flip.phase).toBe('pre');
    expect(zombiesEnabled(flip)).toBe(false);
    expect(flipSkin(flip).nightAmt).toBe(0);
  });

  it('scripted turn lands post after turnDuration', () => {
    let flip = beginFlip(createFlip());
    expect(flip.phase).toBe('turning');
    const frames = Math.ceil(FLIP.turnDuration / DT) + 2;
    for (let i = 0; i < frames; i += 1) {
      flip = stepFlip(flip, DT);
    }
    expect(flip.phase).toBe('post');
    expect(zombiesEnabled(flip)).toBe(true);
    expect(flipSkin(flip).nightAmt).toBe(1);
    expect(flipSkin(flip).sky).not.toBe(flipSkin(createFlip()).sky);
  });

  it('beginFlip is a no-op once post', () => {
    expect(beginFlip(createFlipped()).phase).toBe('post');
  });

  it('tutorial completion starts the flip; skipped tutorial does not', () => {
    const live = createStory({ tutorial: true });
    const charged = {
      ...idle,
      speed: 6,
      atCharge: true,
      hop: true,
      dx: 20,
      steer: 1,
    };
    let story = live;
    for (let i = 0; i < 200; i += 1) {
      story = stepWorldStory(story, DT, charged).story;
    }
    expect(story.tutorial.step).toBe('done');
    expect(story.flip.phase === 'turning' || story.flip.phase === 'post').toBe(
      true,
    );

    const skipped = createStory({ tutorial: false });
    const held = stepWorldStory(skipped, 1, idle);
    expect(held.story.flip.phase).toBe('pre');
    expect(held.seedZombies).toBe(false);
  });
});
