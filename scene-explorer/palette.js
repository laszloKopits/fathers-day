// Shared color palette and geometry helpers
import * as THREE from 'three';

export const C = {
  teal:     0x4ECDC4,
  coral:    0xFF6B6B,
  gold:     0xFFE66D,
  navy:     0x2C3E50,
  road:     0x333333,
  roadLight:0x444444,
  white:    0xF5F5F0,
  warmGray: 0xE8E4DE,
  ground:   0xD9D3CB,
  building: 0xBBB5AD,
  tree:     0x6ABF69,
  treeDark: 0x4A9F49,
  trunk:    0x8B6F47,
  wheel:    0x222222,
  glass:    0x88CCDD,
  laneYellow:0xE8C840,
  laneWhite:0xDDDDDD,
  podWhite: 0xEEEEEE,
  sidewalk: 0xCCC8C0,
  sky:      0x87CEEB,
  skyDark:  0x1a1a2e,
};

// Create a rounded pod mesh
export function createPod(color = C.teal, scale = 1) {
  const group = new THREE.Group();

  // Body: capsule-like shape using a rounded box
  const bodyW = 1.8 * scale, bodyH = 1.2 * scale, bodyL = 3.0 * scale;
  const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL, 4, 4, 4);

  // Round the vertices to make it capsule-ish
  const pos = bodyGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    // Spherize corners
    const hw = bodyW/2, hh = bodyH/2, hl = bodyL/2;
    const r = 0.35 * scale; // corner radius
    const cx = Math.max(Math.abs(v.x) - (hw - r), 0);
    const cy = Math.max(Math.abs(v.y) - (hh - r), 0);
    const cz = Math.max(Math.abs(v.z) - (hl - r), 0);
    const dist = Math.sqrt(cx*cx + cy*cy + cz*cz);
    if (dist > 0) {
      const factor = r / (dist + r) + (1 - r / (dist + r)) * (r / Math.max(dist, r));
      v.x *= factor;
      v.y *= factor;
      v.z *= factor;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  bodyGeo.computeVertexNormals();

  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.3, metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Windshield area (front face tinted)
  const glassGeo = new THREE.PlaneGeometry(bodyW * 0.7, bodyH * 0.55);
  const glassMat = new THREE.MeshStandardMaterial({
    color: C.glass, roughness: 0.1, metalness: 0.3,
    transparent: true, opacity: 0.6,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, bodyH * 0.1, bodyL/2 + 0.01);
  group.add(glass);

  // White accent stripe
  const stripeGeo = new THREE.BoxGeometry(bodyW + 0.02, 0.06 * scale, bodyL * 0.6);
  const stripeMat = new THREE.MeshStandardMaterial({ color: C.podWhite, roughness: 0.5 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = bodyH * 0.15;
  group.add(stripe);

  // Wheels (4)
  const wheelR = 0.2 * scale, wheelW = 0.1 * scale;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: C.wheel, roughness: 0.8 });
  const wheelPositions = [
    [-bodyW/2 - wheelW/2, -bodyH/2 + wheelR * 0.5, bodyL * 0.32],
    [ bodyW/2 + wheelW/2, -bodyH/2 + wheelR * 0.5, bodyL * 0.32],
    [-bodyW/2 - wheelW/2, -bodyH/2 + wheelR * 0.5, -bodyL * 0.32],
    [ bodyW/2 + wheelW/2, -bodyH/2 + wheelR * 0.5, -bodyL * 0.32],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
  });

  // Position so bottom of wheels sit on y=0
  group.position.y = bodyH / 2 + wheelR * 0.5;

  return group;
}

// Simple boxy car
export function createCar(color = 0x7799AA, scale = 1) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(2.0 * scale, 1.2 * scale, 4.5 * scale);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabGeo = new THREE.BoxGeometry(1.7 * scale, 0.8 * scale, 2.2 * scale);
  const cabMat = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.2, transparent: true, opacity: 0.5 });
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.y = 0.9 * scale;
  cab.position.z = -0.3 * scale;
  group.add(cab);

  // Wheels
  const wheelR = 0.3 * scale, wheelW = 0.15 * scale;
  const wGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 10);
  const wMat = new THREE.MeshStandardMaterial({ color: C.wheel, roughness: 0.9 });
  [[-1.1, -0.3, 1.5], [1.1, -0.3, 1.5], [-1.1, -0.3, -1.5], [1.1, -0.3, -1.5]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI/2;
    w.position.set(x * scale, y * scale, z * scale);
    group.add(w);
  });

  group.position.y = 0.9 * scale;
  return group;
}

// Simple building block
export function createBuilding(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: color || C.building,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Kenney-style tree
export function createTree(scale = 1) {
  const group = new THREE.Group();
  const trunkH = 1.2 * scale;
  const trunkR = 0.15 * scale;
  const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.2, trunkH, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: C.trunk, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageR = 0.8 * scale;
  const foliageGeo = new THREE.SphereGeometry(foliageR, 8, 6);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: Math.random() > 0.5 ? C.tree : C.treeDark,
    roughness: 0.8,
  });
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.y = trunkH + foliageR * 0.6;
  foliage.castShadow = true;
  group.add(foliage);

  return group;
}

// Road with lane markings (flat along XZ plane, road goes in Z direction)
export function createRoad(width, length, lanes = 4, opts = {}) {
  const group = new THREE.Group();

  const roadGeo = new THREE.PlaneGeometry(width, length);
  const roadMat = new THREE.MeshStandardMaterial({
    color: opts.color || C.road, roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  // Lane markings
  const laneWidth = width / lanes;
  const dashLength = 3;
  const dashGap = 4;
  const dashGeo = new THREE.PlaneGeometry(0.15, dashLength);
  const dashMat = new THREE.MeshStandardMaterial({ color: C.laneWhite, roughness: 0.5, side: THREE.DoubleSide });

  for (let lane = 1; lane < lanes; lane++) {
    const x = -width/2 + lane * laneWidth;
    const isCenterLine = opts.centerLine && lane === lanes / 2;
    const mat = isCenterLine
      ? new THREE.MeshStandardMaterial({ color: C.laneYellow, roughness: 0.5, side: THREE.DoubleSide })
      : dashMat;

    if (isCenterLine) {
      // Solid center line
      const lineGeo = new THREE.PlaneGeometry(0.15, length);
      const line = new THREE.Mesh(lineGeo, mat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.01, 0);
      group.add(line);
    } else {
      for (let z = -length/2; z < length/2; z += dashLength + dashGap) {
        const dash = new THREE.Mesh(dashGeo, mat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.01, z + dashLength/2);
        group.add(dash);
      }
    }
  }

  // Edge lines (solid white)
  const edgeMat = new THREE.MeshStandardMaterial({ color: C.laneWhite, roughness: 0.5, side: THREE.DoubleSide });
  [-width/2 + 0.1, width/2 - 0.1].forEach(x => {
    const lineGeo = new THREE.PlaneGeometry(0.12, length);
    const line = new THREE.Mesh(lineGeo, edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.01, 0);
    group.add(line);
  });

  return group;
}

// Ground plane
export function createGround(size = 200) {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.95 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  return ground;
}

// Standard scene lighting
export function addLighting(scene, opts = {}) {
  const ambient = new THREE.AmbientLight(0xffffff, opts.ambient || 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(
    opts.sunColor || 0xFFF5E6,
    opts.sunIntensity || 1.2
  );
  sun.position.set(
    opts.sunX || 30,
    opts.sunY || 50,
    opts.sunZ || 20
  );
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  if (opts.fill !== false) {
    const fill = new THREE.DirectionalLight(0x8899BB, 0.3);
    fill.position.set(-20, 20, -10);
    scene.add(fill);
  }

  return { ambient, sun };
}
