import * as THREE from 'three';
import { C, createPod, createRoad, createGround, createBuilding, createTree, addLighting } from './palette.js';

export const meta = {
  title: 'Pod Train Formation',
  desc: 'Pods join a growing platoon in real time — merging from side streets into a flowing train on the main road.',
};

export function build(scene) {
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 80, 180);
  addLighting(scene);
  scene.add(createGround(300));

  const laneW = 3.5;
  const mainRoadW = laneW * 2;
  const roadL = 160;

  // Main road (runs in Z direction)
  const mainRoad = createRoad(mainRoadW, roadL, 2, { centerLine: true });
  scene.add(mainRoad);

  // Side streets (run in X direction)
  const sideRoadW = laneW * 2;
  const sidePositions = [-30, 0, 30];
  sidePositions.forEach(z => {
    [-1, 1].forEach(side => {
      const sideRoad = createRoad(sideRoadW, 40, 2, { centerLine: true });
      sideRoad.rotation.y = Math.PI / 2;
      sideRoad.position.set(side * (mainRoadW/2 + 20), 0, z);
      scene.add(sideRoad);
    });
  });

  // Intersection patches (cover the crossings)
  sidePositions.forEach(z => {
    const patchGeo = new THREE.PlaneGeometry(mainRoadW + 0.5, sideRoadW + 0.5);
    const patchMat = new THREE.MeshStandardMaterial({ color: C.road, roughness: 0.9, side: THREE.DoubleSide });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0, 0.006, z);
    scene.add(patch);
  });

  // Buildings along streets
  for (let z = -70; z < 70; z += 14) {
    const skip = sidePositions.some(sz => Math.abs(z - sz) < 8);
    if (skip) continue;
    [-1, 1].forEach(side => {
      const h = 6 + Math.random() * 10;
      const b = createBuilding(6, h, 10, [0xBBB5AD, 0xC4BEB6, 0xAEA8A0][Math.floor(Math.random()*3)]);
      b.position.set(side * (mainRoadW/2 + 8), 0, z);
      scene.add(b);
    });
  }

  // Trees at corners
  sidePositions.forEach(z => {
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx, sz]) => {
      const t = createTree(0.8);
      t.position.set(sx * (mainRoadW/2 + 3), 0, z + sz * (sideRoadW/2 + 3));
      scene.add(t);
    });
  });

  // Animation: pods in the platoon + merging pods
  const pods = [];
  const mergingPods = [];

  // Main platoon: 4 pods already in formation, moving in +Z
  for (let i = 0; i < 4; i++) {
    const pod = createPod(C.teal, 0.8);
    const startZ = -70 + i * 3.9;
    pod.position.set(laneW * 0.5, 0, startZ);
    pod.rotation.y = Math.PI;
    pod.userData = { baseZ: startZ, inPlatoon: true, index: i };
    scene.add(pod);
    pods.push(pod);
  }

  // Merging pods: one from each side street
  const mergeData = [
    { sideZ: -30, fromSide: -1, delay: 0 },
    { sideZ: 0, fromSide: 1, delay: 2 },
    { sideZ: 30, fromSide: -1, delay: 4 },
  ];

  mergeData.forEach((md, idx) => {
    const pod = createPod(C.coral, 0.8);
    const startX = md.fromSide * 35;
    pod.position.set(startX, 0, md.sideZ);
    pod.rotation.y = md.fromSide > 0 ? Math.PI/2 : -Math.PI/2;
    pod.userData = {
      startX,
      targetX: laneW * 0.5,
      sideZ: md.sideZ,
      fromSide: md.fromSide,
      delay: md.delay,
      phase: 'approach', // approach -> turn -> merge -> joined
      mergeIndex: 4 + idx,
      t: 0,
    };
    scene.add(pod);
    mergingPods.push(pod);
  });

  const speed = 8; // m/s for platoon

  function animate(time, dt) {
    const t = time;

    // Move platoon forward
    pods.forEach(pod => {
      pod.position.z = ((pod.userData.baseZ + t * speed) % 160) - 80;
    });

    // Animate merging pods
    mergingPods.forEach(mp => {
      const d = mp.userData;
      const cycleTime = 160 / speed; // time for one full road cycle
      const localT = ((t - d.delay) % cycleTime + cycleTime) % cycleTime;

      if (localT < 2) {
        // Approach: move from side toward main road
        const progress = localT / 2;
        const eased = progress * progress * (3 - 2 * progress); // smoothstep
        mp.position.x = d.startX + (d.targetX + d.fromSide * 5 - d.startX) * eased;
        mp.position.z = d.sideZ;
        mp.rotation.y = d.fromSide > 0 ? Math.PI/2 : -Math.PI/2;
      } else if (localT < 3.5) {
        // Turn onto main road
        const progress = (localT - 2) / 1.5;
        const eased = progress * progress * (3 - 2 * progress);
        mp.position.x = (d.targetX + d.fromSide * 5) + (d.targetX - (d.targetX + d.fromSide * 5)) * eased;
        mp.position.z = d.sideZ + eased * 8;
        mp.rotation.y = Math.PI * (1 - eased * 0.5) * (d.fromSide > 0 ? 1 : -1);
        if (d.fromSide > 0) {
          mp.rotation.y = Math.PI/2 + eased * Math.PI/2;
        } else {
          mp.rotation.y = -Math.PI/2 - eased * Math.PI/2;
        }
      } else if (localT < cycleTime - 1) {
        // In formation, moving with platoon
        mp.position.x = d.targetX;
        mp.position.z = d.sideZ + 8 + (localT - 3.5) * speed;
        mp.rotation.y = Math.PI;

        // Wrap
        if (mp.position.z > 80) mp.position.z -= 160;
      } else {
        // Reset approaching
        mp.position.x = d.startX;
        mp.position.z = d.sideZ;
        mp.rotation.y = d.fromSide > 0 ? Math.PI/2 : -Math.PI/2;
      }
    });
  }

  return {
    camera: { position: [40, 35, 30], target: [0, 0, 0] },
    animate,
  };
}
