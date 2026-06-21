import * as THREE from 'three';
import { C, createPod, createCar, createRoad, addLighting } from './palette.js';

export const meta = {
  title: 'Capacity Comparison',
  desc: 'Same road, three densities: cars (2,000/hr), pods (12,000/hr), and a subway train for scale. The empty space in (a) is the point.',
};

export function build(scene) {
  scene.background = new THREE.Color(0xF0EDE8);
  addLighting(scene, { ambient: 0.6, sunIntensity: 0.8 });

  const sectionW = 14;
  const sectionL = 80;
  const spacing = 20;

  // Three road sections side by side
  const sections = [
    { label: 'Cars — 2,000/hr', x: -(sectionW + spacing) },
    { label: 'Pods — 12,000/hr', x: 0 },
    { label: 'Subway — 30,000/hr', x: sectionW + spacing },
  ];

  // Ground for each section
  sections.forEach(s => {
    const road = createRoad(sectionW, sectionL, 4, {});
    road.position.x = s.x;
    scene.add(road);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, 256, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(14, 1.8, 1);
    sprite.position.set(s.x, 0.5, -sectionL/2 - 3);
    scene.add(sprite);
  });

  // (a) Cars at 2000/hr density
  // At 60mph, 2000 cars/hr = one car every 1.8s = ~48m apart per lane
  // 4 lanes = ~500/lane/hr
  // Show ~80m of road = about 2 cars per lane
  const carX = -(sectionW + spacing);
  const laneW = sectionW / 4;
  for (let lane = 0; lane < 4; lane++) {
    const lx = carX - sectionW/2 + (lane + 0.5) * laneW;
    for (let z = -30; z < 35; z += 45) {
      const car = createCar([0x7799AA, 0xAA7766, 0x999999, 0x8888AA][lane], 0.75);
      car.position.set(lx, 0, z);
      car.rotation.y = lane < 2 ? 0 : Math.PI;
      scene.add(car);
    }
  }

  // (b) Pods at 12,000/hr density
  // 3000/lane/hr at 30mph (~13m/s) = 1 pod every 1.2s = ~16m apart
  // But platooned: groups of 10 with 3ft gaps, groups spaced ~50m
  // Much more visually dense
  const podX = 0;
  for (let lane = 0; lane < 4; lane++) {
    const lx = podX - sectionW/2 + (lane + 0.5) * laneW;
    // A platoon of pods
    const startZ = -35;
    const podSpacing = 3.9; // pod length + 3ft gap
    const numPods = Math.floor(70 / podSpacing);
    for (let i = 0; i < numPods; i++) {
      const pod = createPod(C.teal, 0.65);
      pod.position.set(lx, 0, startZ + i * podSpacing);
      pod.rotation.y = lane < 2 ? 0 : Math.PI;
      scene.add(pod);
    }
  }

  // (c) Subway train
  const subX = sectionW + spacing;
  // A subway car: ~23m long, ~3m wide, ~3.5m tall
  // Show 4 cars
  const trainColor = 0x888899;
  for (let car = 0; car < 4; car++) {
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(3, 3.5, 22);
    const bodyMat = new THREE.MeshStandardMaterial({ color: trainColor, roughness: 0.4, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3;
    body.castShadow = true;
    carGroup.add(body);

    // Windows
    const winMat = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.1, transparent: true, opacity: 0.5 });
    for (let w = -9; w < 10; w += 3) {
      [-1, 1].forEach(side => {
        const winGeo = new THREE.PlaneGeometry(2, 1.2);
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(side * 1.51, 3.5, w);
        win.rotation.y = side > 0 ? 0 : Math.PI;
        carGroup.add(win);
      });
    }

    // Stripe
    const stripeGeo = new THREE.BoxGeometry(3.05, 0.3, 22.05);
    const stripeMat = new THREE.MeshStandardMaterial({ color: C.coral });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 2.5;
    carGroup.add(stripe);

    carGroup.position.set(subX, 0, -35 + car * 23);
    scene.add(carGroup);
  }

  // Rail tracks
  const railMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 });
  [-1, 1].forEach(side => {
    const railGeo = new THREE.BoxGeometry(0.15, 0.2, sectionL);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(subX + side * 1.2, 0.1, 0);
    scene.add(rail);
  });

  // Animated scrolling to show flow
  const allPods = [];
  const allCars = [];
  scene.traverse(obj => {
    if (obj.userData && obj.userData.isPod) allPods.push(obj);
  });

  function animate(time, dt) {
    // Gentle camera bob
  }

  return {
    camera: { position: [0, 50, 60], target: [0, 0, 0] },
    animate,
  };
}
