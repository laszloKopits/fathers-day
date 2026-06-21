import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene modules
import * as platoonHighway from './scene-platoon-highway.js';
import * as cityConversion from './scene-city-conversion.js';
import * as podFormation from './scene-pod-formation.js';
import * as capacity from './scene-capacity.js';
import * as morningCommute from './scene-morning-commute.js';
import * as podVariants from './scene-pod-variants.js';
import * as drafting from './scene-drafting.js';

const scenes = [
  platoonHighway,
  cityConversion,
  podFormation,
  capacity,
  morningCommute,
  podVariants,
  drafting,
];

// Renderer
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 200;

// State
let currentScene = null;
let currentAnimate = null;
let currentSceneIdx = -1;

// UI
const navEl = document.getElementById('scene-nav');
const titleEl = document.getElementById('scene-title');
const descEl = document.getElementById('scene-desc');

// Build nav buttons
scenes.forEach((mod, idx) => {
  const btn = document.createElement('button');
  btn.className = 'scene-btn';
  btn.textContent = `${idx + 1}. ${mod.meta.title}`;
  btn.addEventListener('click', () => loadScene(idx));
  navEl.appendChild(btn);
});

function loadScene(idx) {
  if (idx === currentSceneIdx) return;

  // Dispose old scene
  if (currentScene) {
    disposeScene(currentScene);
  }

  currentSceneIdx = idx;
  const mod = scenes[idx];

  // Update UI
  titleEl.textContent = mod.meta.title;
  descEl.textContent = mod.meta.desc;

  // Update nav buttons
  document.querySelectorAll('.scene-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  // Build new scene
  const scene = new THREE.Scene();
  const result = mod.build(scene);

  // Set camera
  if (result.camera) {
    const [cx, cy, cz] = result.camera.position;
    camera.position.set(cx, cy, cz);
    if (result.camera.target) {
      const [tx, ty, tz] = result.camera.target;
      controls.target.set(tx, ty, tz);
    }
  }
  controls.update();

  currentScene = scene;
  currentAnimate = result.animate || null;
}

function disposeScene(scene) {
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    }
  });
}

// Animation loop
const clock = new THREE.Clock();

function animate(timestamp) {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05) || 0.016;
  const time = clock.elapsedTime;

  controls.update();

  if (currentAnimate) {
    currentAnimate(time, dt);
  }

  if (currentScene) {
    renderer.render(currentScene, camera);
  }
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    loadScene((currentSceneIdx + 1) % scenes.length);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    loadScene((currentSceneIdx - 1 + scenes.length) % scenes.length);
  } else if (e.key >= '1' && e.key <= '7') {
    const idx = parseInt(e.key) - 1;
    if (idx < scenes.length) loadScene(idx);
  }
});

// Start
loadScene(0);
animate();
