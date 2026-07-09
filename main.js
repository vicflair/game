import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfffaf0);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 16);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

// --- Lighting ---
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
sun.position.set(8, 14, 6);
sun.castShadow = true;
scene.add(sun);

// --- Material helpers ---
function toonMat(color) {
  return new THREE.MeshToonMaterial({ color, roughness: 1.0 });
}

// Attaches a BackSide black outline as a child of the mesh
function withOutline(mesh, scale = 1.05) {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  );
  outline.scale.setScalar(scale);
  mesh.add(outline);
  return mesh;
}

// --- Ground ---
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  toonMat(0x8bc34a)
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// A few static trees for depth
function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 8), toonMat(0x5d3a1a)));
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  g.add(trunk);
  const canopy = withOutline(new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), toonMat(0xe8724a)));
  canopy.position.y = 2.8;
  canopy.castShadow = true;
  g.add(canopy);
  g.position.set(x, 0, z);
  scene.add(g);
}
[[-8, -6], [9, -8], [-12, 4], [11, 3], [0, -10]].forEach(([x, z]) => makeTree(x, z));

// --- Puppy ---
function createPuppyMesh() {
  const TERRA = 0xc1663a;
  const DARK  = 0x3b1f0e;
  // outer: handles physics position + rotation.y for movement
  // inner: rotated so head faces -Z (forward), matching movement direction
  const outer = new THREE.Group();
  const g = new THREE.Group();
  g.rotation.y = Math.PI / 2;
  outer.add(g);

  // Body (capsule lying on its side)
  const body = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.9, 8, 16), toonMat(TERRA)));
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  // Head
  const head = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), toonMat(TERRA)));
  head.position.set(0.85, 0.25, 0);
  head.castShadow = true;
  g.add(head);

  // Snout
  const snout = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), toonMat(0xe8906a)));
  snout.position.set(1.2, 0.15, 0);
  g.add(snout);

  // Floppy ears
  [0.18, -0.18].forEach(z => {
    const ear = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.12), toonMat(DARK)));
    ear.position.set(0.82, 0.52, z);
    ear.rotation.z = z > 0 ? 0.25 : -0.25;
    g.add(ear);
  });

  // Tail
  const tail = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.55, 8), toonMat(TERRA)));
  tail.position.set(-0.85, 0.38, 0);
  tail.rotation.z = -Math.PI / 3.5;
  g.add(tail);

  // Legs (4 little boxes)
  [[-0.35, -0.38], [0.35, -0.38]].forEach(([lx, ly]) => {
    [-0.22, 0.22].forEach(lz => {
      const leg = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.16), toonMat(TERRA)));
      leg.position.set(lx, ly, lz);
      g.add(leg);
    });
  });

  outer.position.y = 0.75;
  return outer;
}

const puppy = createPuppyMesh();
scene.add(puppy);

// Bounding radius for collision
const PUPPY_RADIUS = 1.1;

// --- Leaf ---
const LEAF_COLORS = [0xc1663a, 0xe07850, 0x8b9e5a]; // terracotta, coral, sage

function createLeafMesh(golden = false) {
  const color = golden ? 0xf5c518 : LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
  const g = new THREE.Group();
  // Main flat quad
  const leaf = withOutline(
    new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.42), toonMat(color)),
    1.07
  );
  g.add(leaf);
  // Small stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), toonMat(0x5d3a1a));
  stem.position.set(0.3, 0, 0);
  stem.rotation.z = Math.PI / 2;
  g.add(stem);
  return g;
}

const LEAF_COUNT = 30;

// staggered: true on init so leaves start at random heights, not all at the top
function spawnLeaf(staggered = false) {
  const leaf = createLeafMesh(false);
  const startY = staggered ? Math.random() * 14 : 14;
  leaf.position.set(
    puppy.position.x + (Math.random() - 0.5) * 26,
    startY,
    puppy.position.z + (Math.random() - 0.5) * 26
  );
  leaf.userData = {
    swayOffset: Math.random() * Math.PI * 2,
    swaySpeed:  0.6 + Math.random() * 0.5,
    fallSpeed:  0.04 + Math.random() * 0.025,
  };
  scene.add(leaf);
  return leaf;
}

const leaves = Array.from({ length: LEAF_COUNT }, () => spawnLeaf(true));

// --- Score ---
let score = 0;
const scoreEl = document.getElementById('score');

// --- Controls ---
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

const MOVE_SPEED = 0.12;
const ROT_SPEED  = 0.045;
let velY = 0;
let onGround = true;

// --- Game loop ---
let t = 0;
const camPos = new THREE.Vector3(0, 8, 16);

function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  // Rotation
  if (keys['ArrowLeft']  || keys['a']) puppy.rotation.y += ROT_SPEED;
  if (keys['ArrowRight'] || keys['d']) puppy.rotation.y -= ROT_SPEED;

  // Forward / back
  const moving = keys['ArrowUp'] || keys['w'] || keys['ArrowDown'] || keys['s'];
  if (keys['ArrowUp']   || keys['w']) {
    puppy.position.x -= Math.sin(puppy.rotation.y) * MOVE_SPEED;
    puppy.position.z -= Math.cos(puppy.rotation.y) * MOVE_SPEED;
  }
  if (keys['ArrowDown'] || keys['s']) {
    puppy.position.x += Math.sin(puppy.rotation.y) * MOVE_SPEED;
    puppy.position.z += Math.cos(puppy.rotation.y) * MOVE_SPEED;
  }

  // Jump
  if ((keys[' ']) && onGround) {
    velY = 0.2;
    onGround = false;
  }
  velY -= 0.013;
  puppy.position.y += velY;
  if (puppy.position.y <= 0.75) {
    puppy.position.y = 0.75;
    velY = 0;
    onGround = true;
  }

  // Squash & stretch
  if (moving) {
    const b = 1 + Math.sin(t * 12) * 0.07;
    puppy.scale.set(b, 1 / b, b);
  } else if (!onGround) {
    // Stretch on the way up, squash on the way down
    const stretch = velY > 0 ? 1 + velY * 1.2 : 1 - Math.abs(velY) * 0.5;
    puppy.scale.set(1 / stretch, stretch, 1 / stretch);
  } else {
    puppy.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
  }

  // Camera — follow behind puppy
  const behind = new THREE.Vector3(
    puppy.position.x + Math.sin(puppy.rotation.y) * 11,
    puppy.position.y + 7,
    puppy.position.z + Math.cos(puppy.rotation.y) * 11
  );
  camPos.lerp(behind, 0.07);
  camera.position.copy(camPos);
  camera.lookAt(puppy.position.x, puppy.position.y + 1, puppy.position.z);

  // Leaf canopy — update all 30 leaves
  for (let i = leaves.length - 1; i >= 0; i--) {
    const l = leaves[i];
    const d = l.userData;

    l.position.y -= d.fallSpeed;
    l.position.x += Math.sin(t * d.swaySpeed + d.swayOffset) * 0.025;
    l.rotation.y += 0.025;
    l.rotation.z  = Math.sin(t * d.swaySpeed + d.swayOffset) * 0.35;

    // Respawn at top if it hits the ground
    if (l.position.y < 0) {
      scene.remove(l);
      leaves[i] = spawnLeaf(false);
      continue;
    }

    // Collision
    const dx = puppy.position.x - l.position.x;
    const dy = puppy.position.y - l.position.y;
    const dz = puppy.position.z - l.position.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < PUPPY_RADIUS + 0.4) {
      scene.remove(l);
      leaves[i] = spawnLeaf(false);
      score++;
      scoreEl.innerText = score;
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
