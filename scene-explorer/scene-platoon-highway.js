import * as THREE from 'three';
import { C, createPod, createCar, createRoad, createGround, addLighting } from './palette.js';

export const meta = {
  title: 'Platoon Highway',
  desc: 'A platoon of 10 pods in tight 3ft formation alongside regular cars spaced 150ft apart — the density contrast tells the whole story.',
};

export function build(scene) {
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 80, 200);
  addLighting(scene);
  scene.add(createGround(300));

  // Highway: 6 lanes, 3 each direction
  const laneW = 3.7; // meters
  const lanes = 6;
  const roadW = laneW * lanes;
  const roadL = 200;
  const road = createRoad(roadW, roadL, lanes, { centerLine: true });
  scene.add(road);

  // Shoulder markings (rumble strips feel)
  const shoulderGeo = new THREE.PlaneGeometry(1.5, roadL);
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.95, side: THREE.DoubleSide });
  [-roadW/2 - 0.75, roadW/2 + 0.75].forEach(x => {
    const s = new THREE.Mesh(shoulderGeo, shoulderMat);
    s.rotation.x = -Math.PI/2;
    s.position.set(x, 0.005, 0);
    scene.add(s);
  });

  // Pod platoon in the rightmost lane (lane index 2 from right = lane 5 in 0-indexed from left)
  // Pods travel in +Z direction, rightmost lane center:
  const podLaneX = -roadW/2 + laneW * 4.5; // 5th lane from left
  const podGap = 0.9; // ~3 feet
  const podLength = 3.0;
  const platoonStart = -30;

  for (let i = 0; i < 10; i++) {
    const pod = createPod(C.teal, 0.85);
    pod.position.x = podLaneX;
    pod.position.z = platoonStart + i * (podLength + podGap);
    pod.rotation.y = Math.PI; // face +Z direction
    scene.add(pod);
  }

  // Regular cars in other lanes, spaced ~45m (150ft) apart
  const carColors = [0x7799AA, 0x8888AA, 0xAA7766, 0x999999, 0x6688AA, 0xBB8855];
  // Lanes going same direction (right side): lanes 3, 4 (0-indexed)
  [3, 4].forEach(laneIdx => {
    const laneX = -roadW/2 + (laneIdx + 0.5) * laneW;
    for (let z = -90; z < 90; z += 45) {
      const car = createCar(carColors[Math.floor(Math.random() * carColors.length)], 0.85);
      car.position.x = laneX;
      car.position.z = z + (Math.random() - 0.5) * 5;
      car.rotation.y = Math.PI;
      scene.add(car);
    }
  });

  // Oncoming traffic (lanes 0, 1, 2)
  [0, 1, 2].forEach(laneIdx => {
    const laneX = -roadW/2 + (laneIdx + 0.5) * laneW;
    for (let z = -90; z < 90; z += 50) {
      const car = createCar(carColors[Math.floor(Math.random() * carColors.length)], 0.85);
      car.position.x = laneX;
      car.position.z = z + (Math.random() - 0.5) * 8;
      scene.add(car);
    }
  });

  // Distance labels using sprites
  function makeLabel(text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(44,62,80,0.85)';
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(248, 0); ctx.quadraticCurveTo(256, 0, 256, 8);
    ctx.lineTo(256, 56); ctx.quadraticCurveTo(256, 64, 248, 64);
    ctx.lineTo(8, 64); ctx.quadraticCurveTo(0, 64, 0, 56);
    ctx.lineTo(0, 8); ctx.quadraticCurveTo(0, 0, 8, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6, 1.5, 1);
    sprite.position.copy(position);
    return sprite;
  }

  // Label the pod gap
  scene.add(makeLabel('3 ft gap', new THREE.Vector3(podLaneX + 4, 4, platoonStart + 5)));

  // Label a car gap
  const carLaneX = -roadW/2 + 3.5 * laneW;
  scene.add(makeLabel('~150 ft gap', new THREE.Vector3(carLaneX - 4, 4, 0)));

  return {
    camera: { position: [35, 25, 10], target: [0, 0, 0] },
    animate: null,
  };
}
