/**
 * Ownership: boot the empty scene + fixed-timestep render loop.
 * Talks via: core/loop and ui/fps only. No gameplay imports.
 * Budget: keep this file under ~300 lines.
 */

import * as THREE from 'three';
import { advanceLoop, createLoop } from './core/loop';
import { createFpsHud } from './ui/fps';

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

function detectFileProtocol(): boolean {
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    showBootError(
      'Bikes v2 needs a local server. Run: npm install && npm run dev',
    );
    return true;
  }
  return false;
}

export function createApp(
  canvas: HTMLCanvasElement,
  fpsEl: HTMLElement,
): { stop(): void } {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x1a1410, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a1410, 40, 180);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  camera.position.set(8, 6, 12);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xc9b89a, 0x3a2a1c, 0.85));
  const sun = new THREE.DirectionalLight(0xffe2b0, 0.9);
  sun.position.set(20, 30, 10);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const origin = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6 }),
  );
  origin.position.y = 0.5;
  scene.add(origin);

  const fps = createFpsHud(fpsEl);
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

  function tick(dt: number): void {
    origin.rotation.y += dt;
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
      render(_alpha) {
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
      renderer.dispose();
    },
  };
}

function boot(): void {
  if (detectFileProtocol()) {
    return;
  }
  const canvas = document.getElementById('game');
  const fpsEl = document.getElementById('fps');
  if (!(canvas instanceof HTMLCanvasElement) || !fpsEl) {
    showBootError('Missing #game canvas or #fps element.');
    return;
  }
  createApp(canvas, fpsEl);
}

boot();
