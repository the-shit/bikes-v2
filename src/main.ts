/**
 * Ownership: boot Jan Ave slice + intent-driven session + chase cam.
 * Talks via: session snapshot. No raw key handling.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { advanceLoop, createLoop } from './core/loop';
import { createSession } from './core/session';
import { createKeyboardAdapter } from './input/keyboard';
import { createFpsHud } from './ui/fps';
import { createHud } from './ui/hud';
import { loadMesaBake } from './world/osm';
import { buildJanSlice } from './world/slice';
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
  const slice = buildJanSlice(bake);
  const session = createSession({
    spawn: slice.spawn,
    terrain: slice.terrain,
    cameraFrame: slice.cameraFrame,
    blockers: slice.blockers,
    shamblerPins: slice.shamblerPins,
  });
  const view = createWorldView(slice);
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

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  const keys = createKeyboardAdapter(window);
  const fps = createFpsHud(fpsEl);
  const hud = createHud(hudEl);
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
    const snap = session.snapshot();
    const { position, lookAt } = snap.camera;
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
  applyCamera();

  function tick(dt: number): void {
    session.tick(dt, keys.sample());
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
        view.sync(snap);
        applyCamera();
        hud.update(snap, loop.fps);
        fps.update(loop.fps);
        renderer.render(scene, camera);
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
