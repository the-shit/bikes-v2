/**
 * M0 boot: empty Three.js scene, fixed-timestep loop, FPS counter.
 * No gameplay. Module stubs live under src/* and stay unused here.
 */

import * as THREE from 'three';
import { advanceLoop, createLoop } from './core/loop.js';

const canvas = document.querySelector('#game');
const fpsEl = document.querySelector('#fps');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('missing #game canvas');
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x1a1410, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1410);
scene.fog = new THREE.Fog(0x1a1410, 24, 80);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xffe6c8, 0.9);
sun.position.set(10, 20, 8);
scene.add(sun);

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}

resize();
window.addEventListener('resize', resize);

const loop = createLoop();
let last = performance.now();

/**
 * @param {number} now
 */
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  advanceLoop(loop, dt, {
    tick() {},
    render(_alpha, state) {
      if (fpsEl && state.fps > 0) {
        fpsEl.textContent = `${Math.round(state.fps)} fps`;
      }
      renderer.render(scene, camera);
    },
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
