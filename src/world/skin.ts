/**
 * Ownership: pre/post flip palettes (campy dusk, not horror).
 * Talks via: FlipSkin numbers. View applies; no Three.js here.
 * Budget: keep this file under ~300 lines.
 */

import type { FlipState } from './flip';

export type FlipSkin = {
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemiInt: number;
  sun: number;
  sunInt: number;
  moonInt: number;
  nightAmt: number;
};

const PRE: FlipSkin = {
  sky: 0xb8cfe0,
  fog: 0xc9b89a,
  fogNear: 140,
  fogFar: 980,
  hemiSky: 0xfff0d8,
  hemiGround: 0x8a6a45,
  hemiInt: 0.85,
  sun: 0xffe0a8,
  sunInt: 1.25,
  moonInt: 0,
  nightAmt: 0,
};

const POST_NIGHT: FlipSkin = {
  sky: 0x2a1c38,
  fog: 0x4a3050,
  fogNear: 50,
  fogFar: 520,
  hemiSky: 0xe8b4d4,
  hemiGround: 0x3a2048,
  hemiInt: 0.42,
  sun: 0xff8a4a,
  sunInt: 0.18,
  moonInt: 0.55,
  nightAmt: 1,
};

/** Hazy campy afternoon after the flip — not the pre-flip blue. */
const POST_DAY: FlipSkin = {
  sky: 0xd8b07a,
  fog: 0xc9a070,
  fogNear: 110,
  fogFar: 860,
  hemiSky: 0xffe2b8,
  hemiGround: 0x7a4a38,
  hemiInt: 0.72,
  sun: 0xffc078,
  sunInt: 0.85,
  moonInt: 0.05,
  nightAmt: 0,
};

const POST = POST_NIGHT;

export function flipSkin(state: FlipState): FlipSkin {
  if (state.phase === 'pre') {
    return PRE;
  }
  if (state.phase === 'post') {
    return POST;
  }
  return lerpSkin(PRE, POST, ease(state.progress));
}

export function playSkin(state: FlipState, nightAmt = 1): FlipSkin {
  if (state.phase !== 'post') {
    return flipSkin(state);
  }
  return lerpSkin(POST_DAY, POST_NIGHT, Math.max(0, Math.min(1, nightAmt)));
}

export function lerpSkin(a: FlipSkin, b: FlipSkin, t: number): FlipSkin {
  const k = Math.max(0, Math.min(1, t));
  return {
    sky: lerpHex(a.sky, b.sky, k),
    fog: lerpHex(a.fog, b.fog, k),
    fogNear: a.fogNear + (b.fogNear - a.fogNear) * k,
    fogFar: a.fogFar + (b.fogFar - a.fogFar) * k,
    hemiSky: lerpHex(a.hemiSky, b.hemiSky, k),
    hemiGround: lerpHex(a.hemiGround, b.hemiGround, k),
    hemiInt: a.hemiInt + (b.hemiInt - a.hemiInt) * k,
    sun: lerpHex(a.sun, b.sun, k),
    sunInt: a.sunInt + (b.sunInt - a.sunInt) * k,
    moonInt: a.moonInt + (b.moonInt - a.moonInt) * k,
    nightAmt: a.nightAmt + (b.nightAmt - a.nightAmt) * k,
  };
}

function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
