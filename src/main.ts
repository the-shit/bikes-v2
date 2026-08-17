/**
 * Ownership: boot Mesa playfield + flip story + intent-driven session.
 * Talks via: session snapshot and feedback events. No raw key handling.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { currentBuildId } from './buildInfo';
import { createBus } from './core/events';
import { advanceLoop, createLoop } from './core/loop';
import { createSession } from './core/session';
import { combineIntents } from './input/combine';
import { createGamepadAdapter } from './input/gamepad';
import { mountFeedbackHotkey } from './input/hotkeys';
import { createKeyboardAdapter } from './input/keyboard';
import { createTouchAdapter } from './input/touch';
import { bindFeedbackCapture } from './ui/capture';
import { createFeedback } from './ui/feedback';
import { createFpsHud } from './ui/fps';
import { createHud } from './ui/hud';
import { bindFeedbackSnapshot } from './ui/snapshot';
import { loadMesaBake } from './world/osm';
import { buildMesaPlay } from './world/mesa';
import { playSkin } from './world/skin';
import { createStory } from './world/story';
import { createWorldView } from './world/view';

const BOOT_ERROR_ID = 'boot-error';

function showBootError(message: string): void {
  let el = document.getElementById(BOOT_ERROR_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = BOOT_ERROR_ID;
    el.setAttribute('role', 'alert');
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      display: 'grid',
      placeItems: 'center',
      background: '#1a1410',
      color: '#e8dcc8',
      fontFamily: 'ui-monospace, Menlo, monospace',
      padding: '2rem',
      textAlign: 'center',
      zIndex: '9999',
    });
    document.body.appendChild(el);
  }
  el.textContent = message;
}

export async function createApp(
  canvas: HTMLCanvasElement,
  fpsEl: HTMLElement,
  hudEl: HTMLElement,
): Promise<{ stop(): void }> {
  const bake = await loadMesaBake();
  const play = buildMesaPlay(bake);
  const localRiderId = 1;
  const session = createSession({
    riders: [{ id: localRiderId, ...play.spawn }],
    terrain: play.terrain,
    cameraFrame: play.cameraFrame,
    blockers: play.blockers,
    shamblerPins: play.shamblerPins,
    hazards: play.hazards,
    chargePoints: play.chargePoints,
    ramps: play.ramps,
    spots: play.spots,
    story: createStory({ tutorial: true }),
  });
  const view = createWorldView(play);
  view.sync(session.snapshot());

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xb8cfe0, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8cfe0);
  scene.fog = new THREE.Fog(0xc9b89a, 80, 280);
  scene.add(view.group);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1800);
  const keys = createKeyboardAdapter(window);
  const pad = createGamepadAdapter();
  const touch = createTouchAdapter(canvas);
  const fps = createFpsHud(fpsEl);
  const hud = createHud(hudEl, play.chargePoints);
  const bus = createBus();
  const feedback = createFeedback(document.body, bus);
  const unsubHotkey = mountFeedbackHotkey(bus);
  const unsubSnapshot = bindFeedbackSnapshot(bus, () => {
    const snap = session.snapshot();
    const rider = snap.riders.find((r) => r.id === localRiderId);
    const pack = rider
      ? snap.bikes.find((b) => b.id === (rider.mountedBikeId ?? rider.lastBikeId))
      : undefined;
    return {
      position: rider
        ? { x: rider.bike.x, y: rider.bike.y, z: rider.bike.z }
        : null,
      speed: rider ? rider.bike.speed : 0,
      street: play.jan?.name ?? null,
      lat: null,
      lon: null,
      pressure: pack ? pack.tires.pressure : null,
      buildId: currentBuildId(),
      at: new Date().toISOString(),
    };
  });
  const capture = bindFeedbackCapture(bus, canvas);
  const loop = createLoop();
  let last = performance.now();
  let running = true;
  let raf = 0;

  function resize(): void {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyCamera(): void {
    const rider = session.snapshot().riders.find((r) => r.id === localRiderId);
    if (!rider) {
      return;
    }
    const { position, lookAt } = rider.camera;
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
  applyCamera();

  function tick(dt: number): void {
    session.tick(dt, {
      [localRiderId]: combineIntents(keys.sample(), pad.sample(), touch.sample()),
    });
  }

  function frame(now: number): void {
    if (!running) {
      return;
    }
    raf = requestAnimationFrame(frame);
    const frameDt = (now - last) / 1000;
    last = now;
    advanceLoop(loop, frameDt, {
      tick,
      render() {
        const snap = session.snapshot();
        const skin = playSkin(snap.story.flip, snap.sky.nightAmt);
        scene.background = new THREE.Color(skin.sky);
        scene.fog = new THREE.Fog(skin.fog, skin.fogNear, skin.fogFar);
        renderer.setClearColor(skin.sky, 1);
        view.sync(snap);
        applyCamera();
        hud.update(snap, localRiderId, loop.fps);
        fps.update(loop.fps);
        renderer.render(scene, camera);
        capture.afterRender();
      },
    });
  }

  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      keys.dispose();
      touch.dispose();
      unsubHotkey();
      unsubSnapshot();
      capture.dispose();
      feedback.destroy();
      renderer.dispose();
    },
  };
}

async function boot(): Promise<void> {
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    showBootError('Bikes v2 needs a local server. Run: npm install && npm run dev');
    return;
  }
  const canvas = document.getElementById('game');
  const fpsEl = document.getElementById('fps');
  const hudEl = document.getElementById('hud');
  if (!(canvas instanceof HTMLCanvasElement) || !fpsEl || !hudEl) {
    showBootError('Missing #game canvas, #fps, or #hud.');
    return;
  }
  try {
    await createApp(canvas, fpsEl, hudEl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showBootError(`Boot failed: ${msg}`);
  }
}

void boot();
