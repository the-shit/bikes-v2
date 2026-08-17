/**
 * Ownership: flip + tutorial as one world story clock.
 * Talks via: WorldStory. Session steps this; view/HUD read the snapshot.
 * Budget: keep this file under ~300 lines.
 */

import {
  beginFlip,
  createFlip,
  createFlipped,
  flipCue,
  stepFlip,
  type FlipState,
} from './flip';
import type { ChargePoint } from './charge';
import { nearCharge } from './charge';
import type { Intent } from '../input/intents';
import { idleIntent } from '../input/intents';
import {
  createTutorial,
  skipTutorial,
  stepTutorial,
  tutorialPrompt,
  type TutorialSample,
  type TutorialState,
} from './tutorial';

export type StoryRider = {
  id: number;
  bike: { x: number; z: number; speed: number };
  air: { airborne: boolean };
};

export type WorldStory = {
  flip: FlipState;
  tutorial: TutorialState;
};

export type StoryStep = {
  story: WorldStory;
  seedZombies: boolean;
  toast?: string;
  cues: string[];
};

export function createStory(opts?: {
  flipped?: boolean;
  tutorial?: boolean;
}): WorldStory {
  if (opts?.flipped) {
    return { flip: createFlipped(), tutorial: skipTutorial() };
  }
  return {
    flip: createFlip(),
    tutorial: opts?.tutorial === false ? skipTutorial() : createTutorial(),
  };
}

export function stepWorldStory(
  story: WorldStory,
  dt: number,
  sample: TutorialSample,
): StoryStep {
  const cues: string[] = [];
  let toast: string | undefined;
  const wasDone = story.tutorial.step === 'done';
  const tut = stepTutorial(story.tutorial, dt, sample);
  let flip = story.flip;
  if (tut.ding) {
    cues.push('tutorial.ding');
  }
  toast = tut.toast;
  if (!wasDone && tut.state.step === 'done' && flip.phase === 'pre') {
    const from = flip.phase;
    flip = beginFlip(flip);
    const cue = flipCue(from, flip.phase);
    if (cue) {
      cues.push(cue);
    }
    toast = 'THE SLUSHIE MACHINE SCREAMED';
  }
  const prev = flip.phase;
  flip = stepFlip(flip, dt);
  let seedZombies = false;
  if (prev !== 'post' && flip.phase === 'post') {
    seedZombies = true;
    const cue = flipCue(prev, flip.phase);
    if (cue) {
      cues.push(cue);
    }
    toast = toast ?? 'Mesa flipped — shamblers on parade!';
  }
  return {
    story: { flip, tutorial: tut.state },
    seedZombies,
    toast,
    cues,
  };
}

export function storySample(
  riders: readonly StoryRider[],
  intents: Readonly<Record<number, Intent>>,
  chargePoints: readonly ChargePoint[],
  dt: number,
): TutorialSample {
  let speed = 0;
  let steer = 0;
  let hop = false;
  let airborne = false;
  let atCharge = false;
  for (const r of riders) {
    const intent = intents[r.id] ?? idleIntent();
    speed = Math.max(speed, Math.abs(r.bike.speed));
    steer = Math.abs(intent.steer) > Math.abs(steer) ? intent.steer : steer;
    hop = hop || intent.hop;
    airborne = airborne || r.air.airborne;
    if (nearCharge(r.bike.x, r.bike.z, chargePoints)?.kind === 'circlek') {
      atCharge = true;
    }
  }
  return {
    speed,
    steer,
    hop,
    airborne,
    atCharge,
    dx: speed * Math.max(0, dt),
    dz: 0,
  };
}

export function storyLine(story: WorldStory): string {
  if (story.flip.phase === 'turning') {
    return story.flip.progress < 0.45
      ? 'THE SLUSHIE MACHINE SCREAMED'
      : 'sky went weird…';
  }
  if (story.flip.phase === 'post') {
    return '';
  }
  return tutorialPrompt(story.tutorial);
}
