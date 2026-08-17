/**
 * Ownership: pre-flip intro-as-tutorial. World-level, not per-rider.
 * Talks via: TutorialState. Session samples riders; HUD reads prompts.
 * Budget: keep this file under ~300 lines.
 */

export type TutorialStep = 'throttle' | 'steer' | 'hop' | 'charge' | 'done';

export type TutorialState = {
  step: TutorialStep;
  t: number;
  hopped: boolean;
  charged: boolean;
  traveled: number;
};

export type TutorialSample = {
  speed: number;
  steer: number;
  hop: boolean;
  airborne: boolean;
  atCharge: boolean;
  dx: number;
  dz: number;
};

export const TUTORIAL = {
  rollSpeed: 2.4,
  rollMeters: 8,
  steerAbs: 0.28,
  chargeHold: 0.7,
} as const;

const PROMPT: Record<TutorialStep, string> = {
  throttle: 'W — roll out of the carport. Nice and easy.',
  steer: 'A/D — point the bars down Jan Ave.',
  hop: 'Shift — hop the yellow ramp. Boing.',
  charge: 'Circle K is south — slushie juice for the pack.',
  done: '',
};

export function createTutorial(): TutorialState {
  return {
    step: 'throttle',
    t: 0,
    hopped: false,
    charged: false,
    traveled: 0,
  };
}

export function skipTutorial(): TutorialState {
  return {
    step: 'done',
    t: 0,
    hopped: true,
    charged: true,
    traveled: 0,
  };
}

export function tutorialPrompt(state: TutorialState): string {
  return PROMPT[state.step];
}

export function stepTutorial(
  state: TutorialState,
  dt: number,
  sample: TutorialSample,
): { state: TutorialState; toast?: string; ding: boolean } {
  if (state.step === 'done') {
    return { state, ding: false };
  }
  const traveled =
    state.traveled + Math.hypot(sample.dx, sample.dz);
  const hopped = state.hopped || sample.hop || sample.airborne;
  const charged = state.charged || sample.atCharge;
  let step: TutorialStep = state.step;
  let t = state.t + dt;
  let toast: string | undefined;
  let ding = false;

  if (step === 'throttle' && traveled >= TUTORIAL.rollMeters && sample.speed >= TUTORIAL.rollSpeed) {
    step = 'steer';
    t = 0;
    ding = true;
    toast = 'Rolling!';
  } else if (step === 'steer' && Math.abs(sample.steer) >= TUTORIAL.steerAbs) {
    step = 'hop';
    t = 0;
    ding = true;
    toast = 'Bars work!';
  } else if (step === 'hop' && hopped) {
    step = 'charge';
    t = 0;
    ding = true;
    toast = 'Boing! Circle K next.';
  } else if (step === 'charge' && charged && t >= TUTORIAL.chargeHold) {
    step = 'done';
    t = 0;
    ding = true;
    toast = 'Pack humming. Something fizzes…';
  }

  return {
    state: { step, t, hopped, charged, traveled },
    toast,
    ding,
  };
}
