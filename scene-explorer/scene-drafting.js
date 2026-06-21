import * as THREE from 'three';
import { C, createPod, addLighting } from './palette.js';

export const meta = {
  title: 'Drafting Physics',
  desc: 'Streamlines show how the lead pod breaks the air and followers ride in the slipstream. Turbulent wake at the rear makes the energy savings visible.',
};

export function build(scene) {
  scene.background = new THREE.Color(0x1E2A3A);
  scene.fog = new THREE.Fog(0x1E2A3A, 40, 120);

  // Darker, more dramatic lighting for this technical scene
  const ambient = new THREE.AmbientLight(0x334466, 0.4);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xCCDDFF, 0.8);
  key.position.set(10, 20, 15);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x446688, 0.3);
  fill.position.set(-10, 10, -5);
  scene.add(fill);

  // Ground plane (dark)
  const groundGeo = new THREE.PlaneGeometry(200, 60);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Road surface
  const roadGeo = new THREE.PlaneGeometry(6, 200);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.9 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.005;
  scene.add(road);

  // Side view: platoon of 6 pods
  const podSpacing = 3.9;
  const platoonStart = -12;
  const podGroup = new THREE.Group();

  for (let i = 0; i < 6; i++) {
    const pod = createPod(i === 0 ? C.coral : C.teal, 0.85);
    pod.position.z = platoonStart + i * podSpacing;
    pod.rotation.y = Math.PI;
    podGroup.add(pod);
  }
  scene.add(podGroup);

  // Particle system for air flow streamlines
  const numStreamlines = 40;
  const particlesPerLine = 60;
  const totalParticles = numStreamlines * particlesPerLine;

  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(totalParticles * 3);
  const colors = new Float32Array(totalParticles * 3);
  const sizes = new Float32Array(totalParticles);
  const velocities = new Float32Array(totalParticles); // store base speed

  // Initialize streamline positions
  for (let line = 0; line < numStreamlines; line++) {
    const y = 0.3 + Math.random() * 2.5; // height variation
    const xOffset = (Math.random() - 0.5) * 3; // lateral spread

    for (let p = 0; p < particlesPerLine; p++) {
      const idx = (line * particlesPerLine + p) * 3;
      const z = -40 + (p / particlesPerLine) * 80;

      positions[idx] = xOffset;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      // Color: blue for fast/laminar, red/orange for turbulent
      const tealR = 0.306, tealG = 0.804, tealB = 0.769;
      colors[idx] = tealR;
      colors[idx + 1] = tealG;
      colors[idx + 2] = tealB;

      sizes[line * particlesPerLine + p] = 0.08;
      velocities[line * particlesPerLine + p] = 0.8 + Math.random() * 0.4;
    }
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Pressure labels
  function makeLabel(text, pos, color = '#fff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6, 1.2, 1);
    sprite.position.copy(pos);
    return sprite;
  }

  scene.add(makeLabel('HIGH PRESSURE', new THREE.Vector3(0, 4, platoonStart - 3), '#FF6B6B'));
  scene.add(makeLabel('LOW PRESSURE ZONE', new THREE.Vector3(0, 4, platoonStart + podSpacing * 2.5), '#4ECDC4'));
  scene.add(makeLabel('TURBULENT WAKE', new THREE.Vector3(0, 4, platoonStart + podSpacing * 6 + 3), '#FFE66D'));

  // Drag reduction labels between pods
  const reductions = ['Lead: 100% drag', '−30% drag', '−40% drag', '−45% drag', '−45% drag', '−40% drag'];
  reductions.forEach((text, i) => {
    scene.add(makeLabel(text, new THREE.Vector3(4.5, 1.5, platoonStart + i * podSpacing), i === 0 ? '#FF6B6B' : '#4ECDC4'));
  });

  function animate(time, dt) {
    const pos = particleGeo.attributes.position;
    const col = particleGeo.attributes.color;

    for (let line = 0; line < numStreamlines; line++) {
      for (let p = 0; p < particlesPerLine; p++) {
        const idx = line * particlesPerLine + p;
        const i3 = idx * 3;

        let z = pos.getZ(idx);
        const x = pos.getX(idx);
        const y = pos.getY(idx);
        const baseSpeed = velocities[idx];

        // Check if particle is near a pod (deflection zone)
        let nearPod = false;
        let inWake = false;
        let inDraft = false;

        for (let pi = 0; pi < 6; pi++) {
          const podZ = platoonStart + pi * podSpacing;
          const dz = z - podZ;
          const dy = y - 1.2; // pod center height
          const dx = Math.abs(x);

          // Near pod body
          if (Math.abs(dz) < 1.8 && dx < 1.2 && dy < 0.8 && dy > -0.8) {
            nearPod = true;
          }
          // In drafting zone between pods
          if (pi > 0 && dz > -0.5 && dz < podSpacing - 1.5 && dx < 1.5 && dy < 1.2) {
            inDraft = true;
          }
        }

        // Wake zone behind last pod
        const lastPodZ = platoonStart + 5 * podSpacing;
        if (z > lastPodZ + 1.5 && z < lastPodZ + 15 && Math.abs(x) < 2.5 && y < 2.5) {
          inWake = true;
        }

        // Movement
        let speed = baseSpeed * 12;
        let yDrift = 0;
        let xDrift = 0;

        if (nearPod) {
          // Deflect around pod
          xDrift = (x > 0 ? 1 : -1) * 2;
          yDrift = (y > 1.2 ? 1 : -0.5) * 1.5;
          speed *= 1.5;
          // Red color for high pressure
          colors[i3] = 1.0; colors[i3+1] = 0.42; colors[i3+2] = 0.42;
          sizes[idx] = 0.15;
        } else if (inDraft) {
          // Smooth flow, slightly slower (low pressure)
          speed *= 0.7;
          // Teal for laminar
          colors[i3] = 0.306; colors[i3+1] = 0.804; colors[i3+2] = 0.769;
          sizes[idx] = 0.06;
        } else if (inWake) {
          // Turbulent: random perturbation
          xDrift = (Math.sin(time * 5 + idx) * 2);
          yDrift = (Math.cos(time * 3 + idx * 0.7) * 1.5);
          speed *= 0.5;
          // Yellow/orange for turbulence
          colors[i3] = 1.0; colors[i3+1] = 0.9; colors[i3+2] = 0.43;
          sizes[idx] = 0.14;
        } else {
          // Free stream
          colors[i3] = 0.5; colors[i3+1] = 0.7; colors[i3+2] = 0.85;
          sizes[idx] = 0.08;
        }

        z -= speed * dt;
        const newX = x + xDrift * dt;
        const newY = y + yDrift * dt;

        // Wrap around
        if (z < -42) {
          z = 42;
          // Reset to original streamline position
          const origY = 0.3 + (line / numStreamlines) * 2.5;
          const origX = ((line % 10) - 5) * 0.6;
          pos.setXYZ(idx, origX, origY, z);
        } else {
          pos.setXYZ(idx, newX, Math.max(0.2, Math.min(4, newY)), z);
        }
      }
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    particleGeo.attributes.size.needsUpdate = true;
  }

  return {
    camera: { position: [12, 5, 5], target: [0, 1.5, 0] },
    animate,
  };
}
