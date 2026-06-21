import * as THREE from 'three';
import { C, addLighting } from './palette.js';

export const meta = {
  title: 'Pod Design Variants',
  desc: 'Four pod types on a showroom turntable: 2-seater commuter, 4-seater family, cargo, and wheelchair-accessible. Same platform, different lives.',
};

function createDetailedPod(config) {
  const { width, height, length, color, label, features } = config;
  const group = new THREE.Group();

  // Body — smoothed box
  const bodyGeo = new THREE.BoxGeometry(width, height, length, 6, 6, 6);
  const pos = bodyGeo.attributes.position;
  const v = new THREE.Vector3();
  const r = Math.min(width, height, length) * 0.2;
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const hw = width/2, hh = height/2, hl = length/2;
    const cx = Math.max(Math.abs(v.x) - (hw - r), 0);
    const cy = Math.max(Math.abs(v.y) - (hh - r), 0);
    const cz = Math.max(Math.abs(v.z) - (hl - r), 0);
    const dist = Math.sqrt(cx*cx + cy*cy + cz*cz);
    if (dist > 0) {
      const factor = r / (dist + r) + (1 - r / (dist + r)) * (r / Math.max(dist, r));
      v.x *= factor; v.y *= factor; v.z *= factor;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  bodyGeo.computeVertexNormals();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Windshield
  const glassW = width * 0.75;
  const glassH = height * 0.5;
  const glassGeo = new THREE.PlaneGeometry(glassW, glassH);
  const glassMat = new THREE.MeshStandardMaterial({
    color: C.glass, roughness: 0.1, metalness: 0.3,
    transparent: true, opacity: 0.5,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, height * 0.1, length/2 + 0.02);
  group.add(glass);

  // Rear glass
  const rearGlass = new THREE.Mesh(glassGeo, glassMat);
  rearGlass.position.set(0, height * 0.1, -length/2 - 0.02);
  rearGlass.rotation.y = Math.PI;
  group.add(rearGlass);

  // Side windows
  if (!features?.noSideWindows) {
    [-1, 1].forEach(side => {
      const sideGlassGeo = new THREE.PlaneGeometry(length * 0.6, glassH);
      const sg = new THREE.Mesh(sideGlassGeo, glassMat);
      sg.position.set(side * (width/2 + 0.02), height * 0.1, 0);
      sg.rotation.y = side > 0 ? -Math.PI/2 : Math.PI/2;
      group.add(sg);
    });
  }

  // White accent stripe
  const stripeGeo = new THREE.BoxGeometry(width + 0.04, 0.08, length * 0.65);
  const stripeMat = new THREE.MeshStandardMaterial({ color: C.podWhite, roughness: 0.5 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = height * 0.15;
  group.add(stripe);

  // Wheels
  const wheelR = Math.min(width, height) * 0.15;
  const wheelW = 0.12;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: C.wheel, roughness: 0.8 });
  const wheelZ = length * 0.35;
  [[-width/2 - wheelW/2, -height/2 + wheelR, wheelZ],
   [ width/2 + wheelW/2, -height/2 + wheelR, wheelZ],
   [-width/2 - wheelW/2, -height/2 + wheelR, -wheelZ],
   [ width/2 + wheelW/2, -height/2 + wheelR, -wheelZ],
  ].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(x, y, z);
    group.add(w);
  });

  // Feature: ramp (wheelchair pod)
  if (features?.ramp) {
    const rampGeo = new THREE.BoxGeometry(width * 0.8, 0.08, 1.2);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.7 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, -height/2 + 0.04, -length/2 - 0.6);
    ramp.rotation.x = 0.15;
    group.add(ramp);

    // Wheelchair icon (simplified: circle + lines)
    const iconGeo = new THREE.RingGeometry(0.15, 0.2, 16);
    const iconMat = new THREE.MeshStandardMaterial({ color: 0x3388FF, side: THREE.DoubleSide });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    icon.position.set(width/2 + 0.03, 0, 0);
    icon.rotation.y = -Math.PI/2;
    group.add(icon);
  }

  // Feature: cargo (no windows, larger, with cargo marking)
  if (features?.cargo) {
    // Cargo door lines
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    [-1, 1].forEach(side => {
      const doorLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, height * 0.7, 0.03),
        doorMat
      );
      doorLine.position.set(side * (width/2 + 0.02), 0, -length * 0.1);
      group.add(doorLine);
    });
  }

  // Headlights
  const headlightGeo = new THREE.CircleGeometry(0.12, 8);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFDD, emissive: 0xFFFFDD, emissiveIntensity: 0.3
  });
  [-0.4, 0.4].forEach(xOff => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.position.set(xOff * width, -height * 0.1, length/2 + 0.02);
    group.add(hl);
  });

  // Taillights
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xFF3333, emissive: 0xFF3333, emissiveIntensity: 0.2
  });
  [-0.4, 0.4].forEach(xOff => {
    const tl = new THREE.Mesh(headlightGeo, tailMat);
    tl.position.set(xOff * width, -height * 0.1, -length/2 - 0.02);
    tl.rotation.y = Math.PI;
    group.add(tl);
  });

  // Position group so bottom of wheels are at y=0
  group.position.y = height/2 + wheelR;

  // Name label below
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const labelMat = new THREE.SpriteMaterial({ map: tex });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.scale.set(4, 0.8, 1);
  labelSprite.position.y = -0.3;
  group.add(labelSprite);

  return group;
}

export function build(scene) {
  scene.background = new THREE.Color(0xF5F3EE);

  addLighting(scene, { ambient: 0.6, sunIntensity: 0.9, sunX: 20, sunY: 40, sunZ: 30 });

  // Floor: circular showroom platform
  const floorGeo = new THREE.CircleGeometry(18, 48);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xE8E4DE, roughness: 0.6 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Rim
  const rimGeo = new THREE.TorusGeometry(18, 0.15, 8, 48);
  const rimMat = new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.3 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI/2;
  rim.position.y = 0.1;
  scene.add(rim);

  // Pod configurations
  const pods = [
    {
      width: 1.5, height: 1.3, length: 2.5,
      color: C.teal, label: '2-Seat Commuter',
      features: {},
    },
    {
      width: 1.8, height: 1.5, length: 3.2,
      color: 0x5B9BD5, label: '4-Seat Family',
      features: {},
    },
    {
      width: 1.8, height: 1.6, length: 3.0,
      color: C.gold, label: 'Cargo Pod',
      features: { cargo: true, noSideWindows: true },
    },
    {
      width: 2.0, height: 1.4, length: 3.2,
      color: 0x7BC67E, label: 'Accessible Pod',
      features: { ramp: true },
    },
  ];

  // Turntable group
  const turntable = new THREE.Group();
  scene.add(turntable);

  const radius = 8;
  pods.forEach((config, i) => {
    const angle = (i / pods.length) * Math.PI * 2;
    const pod = createDetailedPod(config);
    pod.position.x = Math.cos(angle) * radius;
    pod.position.z = Math.sin(angle) * radius;
    pod.rotation.y = -angle + Math.PI/2;
    turntable.add(pod);
  });

  function animate(time) {
    turntable.rotation.y = time * 0.15;
  }

  return {
    camera: { position: [15, 10, 15], target: [0, 2, 0] },
    animate,
  };
}
