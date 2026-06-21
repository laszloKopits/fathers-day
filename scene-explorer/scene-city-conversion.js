import * as THREE from 'three';
import { C, createPod, createCar, createBuilding, createTree, createRoad, createGround, addLighting } from './palette.js';

export const meta = {
  title: 'City Street Conversion',
  desc: 'Left: a normal 4-lane street. Right: one lane converted to a dedicated pod lane. Same road, radically different throughput.',
};

export function build(scene) {
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 80, 180);
  addLighting(scene);
  scene.add(createGround(300));

  const laneW = 3.5;
  const roadL = 120;
  const gap = 8; // space between the two views

  // --- LEFT SIDE: Normal 4-lane street ---
  const leftX = -(laneW * 4 / 2 + gap / 2 + laneW * 4 / 2) / 2 - 2;

  const roadLeft = createRoad(laneW * 4, roadL, 4, { centerLine: true });
  roadLeft.position.x = leftX;
  scene.add(roadLeft);

  // Sparse cars
  for (let lane = 0; lane < 4; lane++) {
    const lx = leftX - laneW * 2 + (lane + 0.5) * laneW;
    const dir = lane < 2 ? 0 : Math.PI;
    for (let z = -50; z < 50; z += 35 + Math.random() * 20) {
      const car = createCar(
        [0x7799AA, 0x8888AA, 0xAA7766, 0x999999][Math.floor(Math.random()*4)], 0.8
      );
      car.position.set(lx, 0, z);
      car.rotation.y = dir;
      scene.add(car);
    }
  }

  // Buildings left side
  for (let z = -55; z < 55; z += 12) {
    const h = 8 + Math.random() * 15;
    const bColors = [0xBBB5AD, 0xC4BEB6, 0xAEA8A0, 0xCCC6BE];
    [-1, 1].forEach(side => {
      const b = createBuilding(8, h, 10, bColors[Math.floor(Math.random()*4)]);
      b.position.set(leftX + side * (laneW * 2 + 7), 0, z);
      scene.add(b);
    });
  }

  // --- RIGHT SIDE: Converted street ---
  const rightX = -leftX;

  // Main road (3 car lanes)
  const carRoadW = laneW * 3;
  const roadRight = createRoad(carRoadW, roadL, 3, { centerLine: false });
  roadRight.position.x = rightX - laneW * 0.5;
  scene.add(roadRight);

  // Pod lane (different surface color)
  const podLaneGeo = new THREE.PlaneGeometry(laneW, roadL);
  const podLaneMat = new THREE.MeshStandardMaterial({
    color: 0x2A5A55, // darker teal-tinted road
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const podLane = new THREE.Mesh(podLaneGeo, podLaneMat);
  podLane.rotation.x = -Math.PI / 2;
  podLane.position.set(rightX + carRoadW/2 + laneW * 0.5 - laneW * 0.5, 0.005, 0);
  scene.add(podLane);

  // Pod lane edge markings (solid teal lines)
  const podEdgeMat = new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.5, side: THREE.DoubleSide });
  const podLaneX = rightX + carRoadW/2 + laneW * 0.5 - laneW * 0.5;
  [-laneW/2, laneW/2].forEach(offset => {
    const lineGeo = new THREE.PlaneGeometry(0.12, roadL);
    const line = new THREE.Mesh(lineGeo, podEdgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(podLaneX + offset, 0.015, 0);
    scene.add(line);
  });

  // Pods in dedicated lane (tightly packed)
  for (let z = -50; z < 50; z += 3.9) {
    const pod = createPod(C.teal, 0.75);
    pod.position.set(podLaneX, 0, z);
    pod.rotation.y = Math.PI;
    scene.add(pod);
  }

  // Cars in remaining 3 lanes
  for (let lane = 0; lane < 3; lane++) {
    const lx = rightX - laneW * 0.5 - carRoadW/2 + (lane + 0.5) * laneW;
    for (let z = -50; z < 50; z += 30 + Math.random() * 15) {
      const car = createCar(
        [0x7799AA, 0xAA7766, 0x999999, 0x8888AA][Math.floor(Math.random()*4)], 0.8
      );
      car.position.set(lx, 0, z);
      car.rotation.y = lane < 1 ? 0 : Math.PI;
      scene.add(car);
    }
  }

  // Buildings right side
  for (let z = -55; z < 55; z += 12) {
    const h = 8 + Math.random() * 15;
    const bColors = [0xBBB5AD, 0xC4BEB6, 0xAEA8A0, 0xCCC6BE];
    [-1, 1].forEach(side => {
      const totalW = carRoadW + laneW;
      const b = createBuilding(8, h, 10, bColors[Math.floor(Math.random()*4)]);
      b.position.set(rightX + side * (totalW/2 + 6), 0, z);
      scene.add(b);
    });
  }

  // Divider label
  function makeDividerLabel(text, y) {
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(44,62,80,0.9)';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(194, 0); ctx.quadraticCurveTo(200, 0, 200, 6);
    ctx.lineTo(200, 42); ctx.quadraticCurveTo(200, 48, 194, 48);
    ctx.lineTo(6, 48); ctx.quadraticCurveTo(0, 48, 0, 42);
    ctx.lineTo(0, 6); ctx.quadraticCurveTo(0, 0, 6, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 100, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const s = new THREE.Sprite(mat);
    s.scale.set(8, 2, 1);
    s.position.set(0, y, -55);
    return s;
  }

  scene.add(makeDividerLabel('BEFORE', 20));
  // shift it to left side
  scene.children[scene.children.length-1].position.x = leftX;

  scene.add(makeDividerLabel('AFTER', 20));
  scene.children[scene.children.length-1].position.x = rightX;

  return {
    camera: { position: [0, 45, 55], target: [0, 0, 0] },
    animate: null,
  };
}
