import * as THREE from 'three';
import { C, createPod, createBuilding, createTree, addLighting } from './palette.js';

export const meta = {
  title: 'Morning Commute Vision',
  desc: 'Bird\'s-eye view of a livable city grid with pod-trains on dedicated lanes, wide sidewalks, and golden-hour warmth. The utopian hero shot.',
};

export function build(scene) {
  // Golden hour sky
  scene.background = new THREE.Color(0xFDE8C9);
  scene.fog = new THREE.Fog(0xFDE8C9, 100, 250);

  addLighting(scene, {
    ambient: 0.45,
    sunColor: 0xFFD4A0,
    sunIntensity: 1.5,
    sunX: 40,
    sunY: 25,
    sunZ: 60,
  });

  // Ground
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xD4CEC4, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridSize = 6;
  const blockSize = 22;
  const streetW = 8;
  const totalStep = blockSize + streetW;
  const podLaneW = 3;

  // Build the grid
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const cx = (gx - gridSize/2 + 0.5) * totalStep;
      const cz = (gz - gridSize/2 + 0.5) * totalStep;

      // Block: a group of buildings
      const numBuildings = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < numBuildings; b++) {
        const bw = 4 + Math.random() * 8;
        const bd = 4 + Math.random() * 8;
        const bh = 4 + Math.random() * 18;
        const bx = cx + (Math.random() - 0.5) * (blockSize - bw);
        const bz = cz + (Math.random() - 0.5) * (blockSize - bd);

        const colors = [0xBBB5AD, 0xC4BEB6, 0xAEA8A0, 0xCCC6BE, 0xD4CFC7, 0xB8B0A5];
        const building = createBuilding(bw, bh, bd, colors[Math.floor(Math.random() * colors.length)]);
        building.position.set(bx, 0, bz);
        scene.add(building);
      }

      // Trees on sidewalks around blocks
      const treeCount = 3 + Math.floor(Math.random() * 3);
      for (let t = 0; t < treeCount; t++) {
        const side = Math.floor(Math.random() * 4);
        let tx, tz;
        const offset = (Math.random() - 0.5) * blockSize;
        if (side === 0) { tx = cx - blockSize/2 - 2; tz = cz + offset; }
        else if (side === 1) { tx = cx + blockSize/2 + 2; tz = cz + offset; }
        else if (side === 2) { tx = cx + offset; tz = cz - blockSize/2 - 2; }
        else { tx = cx + offset; tz = cz + blockSize/2 + 2; }
        const tree = createTree(0.7 + Math.random() * 0.3);
        tree.position.set(tx, 0, tz);
        scene.add(tree);
      }
    }
  }

  // Roads
  const roadMat = new THREE.MeshStandardMaterial({ color: C.road, roughness: 0.9 });
  const gridExtent = gridSize * totalStep;

  // Horizontal streets
  for (let gz = 0; gz <= gridSize; gz++) {
    const z = (gz - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const roadGeo = new THREE.PlaneGeometry(gridExtent, streetW);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.005, z);
    road.receiveShadow = true;
    scene.add(road);
  }

  // Vertical streets
  for (let gx = 0; gx <= gridSize; gx++) {
    const x = (gx - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const roadGeo = new THREE.PlaneGeometry(streetW, gridExtent);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.005, 0);
    road.receiveShadow = true;
    scene.add(road);
  }

  // Pod lanes (teal-tinted) on every other street
  const podLaneMat = new THREE.MeshStandardMaterial({
    color: 0x2A5A55, roughness: 0.85, side: THREE.DoubleSide
  });
  const podEdgeMat = new THREE.MeshStandardMaterial({
    color: C.teal, roughness: 0.5, side: THREE.DoubleSide
  });

  // Vertical pod lanes on streets 1, 3, 5
  [1, 3, 5].forEach(gx => {
    const x = (gx - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const laneGeo = new THREE.PlaneGeometry(podLaneW, gridExtent);
    const lane = new THREE.Mesh(laneGeo, podLaneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x + streetW/2 - podLaneW/2 - 0.5, 0.01, 0);
    scene.add(lane);

    // Edge lines
    [-podLaneW/2, podLaneW/2].forEach(offset => {
      const lineGeo = new THREE.PlaneGeometry(0.1, gridExtent);
      const line = new THREE.Mesh(lineGeo, podEdgeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x + streetW/2 - podLaneW/2 - 0.5 + offset, 0.015, 0);
      scene.add(line);
    });
  });

  // Horizontal pod lanes on streets 1, 3, 5
  [1, 3, 5].forEach(gz => {
    const z = (gz - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const laneGeo = new THREE.PlaneGeometry(gridExtent, podLaneW);
    const lane = new THREE.Mesh(laneGeo, podLaneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.01, z - streetW/2 + podLaneW/2 + 0.5);
    scene.add(lane);
  });

  // Animated pod-trains flowing on the pod lanes
  const podTrains = [];

  // Vertical pod trains
  [1, 3, 5].forEach(gx => {
    const x = (gx - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const laneX = x + streetW/2 - podLaneW/2 - 0.5;

    // Create 2 trains per lane at different offsets
    for (let train = 0; train < 2; train++) {
      const trainPods = [];
      const trainSize = 5 + Math.floor(Math.random() * 5);
      const startZ = train * gridExtent/2 - gridExtent/4;

      for (let i = 0; i < trainSize; i++) {
        const pod = createPod(C.teal, 0.55);
        pod.position.set(laneX, 0, startZ + i * 2.5);
        pod.rotation.y = Math.PI;
        scene.add(pod);
        trainPods.push(pod);
      }

      podTrains.push({
        pods: trainPods,
        axis: 'z',
        speed: 6 + Math.random() * 4,
        offset: startZ,
        spacing: 2.5,
        extent: gridExtent,
      });
    }
  });

  // Horizontal pod trains
  [1, 3, 5].forEach(gz => {
    const z = (gz - gridSize/2) * totalStep - totalStep/2 + blockSize/2 + streetW/2;
    const laneZ = z - streetW/2 + podLaneW/2 + 0.5;

    for (let train = 0; train < 2; train++) {
      const trainPods = [];
      const trainSize = 4 + Math.floor(Math.random() * 6);
      const startX = train * gridExtent/2 - gridExtent/4;

      for (let i = 0; i < trainSize; i++) {
        const pod = createPod(C.teal, 0.55);
        pod.position.set(startX + i * 2.5, 0, laneZ);
        pod.rotation.y = Math.PI / 2;
        scene.add(pod);
        trainPods.push(pod);
      }

      podTrains.push({
        pods: trainPods,
        axis: 'x',
        speed: 5 + Math.random() * 5,
        offset: startX,
        spacing: 2.5,
        extent: gridExtent,
      });
    }
  });

  // Pedestrian dots on sidewalks (small spheres)
  const pedGeo = new THREE.SphereGeometry(0.25, 6, 4);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x886655 });
  for (let i = 0; i < 60; i++) {
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(
      (Math.random() - 0.5) * gridExtent * 0.8,
      0.25,
      (Math.random() - 0.5) * gridExtent * 0.8
    );
    ped.castShadow = true;
    scene.add(ped);
  }

  function animate(time, dt) {
    podTrains.forEach(train => {
      train.pods.forEach((pod, i) => {
        const base = train.offset + i * train.spacing;
        const pos = ((base + time * train.speed) % train.extent + train.extent) % train.extent - train.extent/2;
        if (train.axis === 'z') {
          pod.position.z = pos;
        } else {
          pod.position.x = pos;
        }
      });
    });
  }

  return {
    camera: { position: [60, 80, 60], target: [0, 0, 0] },
    animate,
  };
}
