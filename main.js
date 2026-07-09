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
const LEAF_MAX_Y = 14;

// Shared shadow geometry + material (reused across all blobs)
const shadowGeo = new THREE.CircleGeometry(0.55, 16);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  depthWrite: false,
});

function createShadow() {
  const shadow = new THREE.Mesh(shadowGeo, shadowMat.clone());
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02; // just above ground to avoid z-fighting
  scene.add(shadow);
  return shadow;
}

// staggered: true on init so leaves start at random heights, not all at the top
function spawnLeaf(staggered = false) {
  const leaf = createLeafMesh(false);
  const startY = staggered ? Math.random() * LEAF_MAX_Y : LEAF_MAX_Y;
  leaf.position.set(
    puppy.position.x + (Math.random() - 0.5) * 26,
    startY,
    puppy.position.z + (Math.random() - 0.5) * 26
  );
  leaf.userData = {
    swayOffset: Math.random() * Math.PI * 2,
    swaySpeed:  0.6 + Math.random() * 0.5,
    fallSpeed:  0.04 + Math.random() * 0.025,
    shadow:     createShadow(),
  };
  scene.add(leaf);
  return leaf;
}

function removeLeaf(leaf) {
  scene.remove(leaf);
  scene.remove(leaf.userData.shadow);
}

// --- Ground leaves ---
const MAX_GROUND_LEAVES = 180;
const groundLeaves = []; // { mesh, state: 'settled'|'airborne', vx, vy, vz }

function settleLeaf(fallingLeaf) {
  // Remove shadow, detach from falling pool
  scene.remove(fallingLeaf.userData.shadow);
  fallingLeaf.position.y = 0.04;
  fallingLeaf.rotation.x = -Math.PI / 2;
  fallingLeaf.rotation.y = Math.random() * Math.PI * 2;
  fallingLeaf.rotation.z = 0;
  groundLeaves.push({ mesh: fallingLeaf, state: 'settled', vx: 0, vy: 0, vz: 0 });
  if (groundLeaves.length > MAX_GROUND_LEAVES) {
    const oldest = groundLeaves.shift();
    scene.remove(oldest.mesh);
  }
}

function scatterNearby(px, pz) {
  const SCATTER_RADIUS = 2.2;
  for (const gl of groundLeaves) {
    if (gl.state !== 'settled') continue;
    const dx = px - gl.mesh.position.x;
    const dz = pz - gl.mesh.position.z;
    if (dx * dx + dz * dz < SCATTER_RADIUS * SCATTER_RADIUS) {
      gl.state = 'airborne';
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.07;
      gl.vx = Math.cos(angle) * speed;
      gl.vy = 0.07 + Math.random() * 0.09;
      gl.vz = Math.sin(angle) * speed;
    }
  }
}

const leaves = Array.from({ length: LEAF_COUNT }, () => spawnLeaf(true));

// --- Score ---
let score = 0;
const scoreEl = document.getElementById('score');

// --- Controls ---
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// --- Touch / Joystick ---
const joy = { x: 0, y: 0 }; // normalised -1..1
let touchJump = false;

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const jumpBtn      = document.getElementById('jump-btn');

if (joystickBase) {
  const RADIUS = 38; // max knob travel in px
  let activeTouchId = null;

  joystickBase.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    updateJoy(touch);
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === activeTouchId) updateJoy(touch);
    }
  }, { passive: false });

  window.addEventListener('touchend', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === activeTouchId) {
        activeTouchId = null;
        joy.x = 0; joy.y = 0;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
    }
  });

  function updateJoy(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > RADIUS) { dx *= RADIUS / dist; dy *= RADIUS / dist; }
    joy.x = dx / RADIUS;
    joy.y = dy / RADIUS;
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}

if (jumpBtn) {
  jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); touchJump = true;  }, { passive: false });
  jumpBtn.addEventListener('touchend',   e => { e.preventDefault(); touchJump = false; }, { passive: false });
}

const MOVE_SPEED = 0.12;
const ROT_SPEED  = 0.045;
let velY  = 0;
let velX  = 0;
let velZ  = 0;
let onGround = true;
const GRAVITY       = 0.009;
const JUMP_FORCE    = 0.16;
const AIR_CONTROL   = 0.08;
const GROUND_DRAG   = 0.75;

// --- Game loop ---
let t = 0;
const camPos = new THREE.Vector3(0, 8, 16);

function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  // Rotation
  if (keys['ArrowLeft']  || keys['a'] || joy.x < -0.25) puppy.rotation.y += ROT_SPEED;
  if (keys['ArrowRight'] || keys['d'] || joy.x >  0.25) puppy.rotation.y -= ROT_SPEED;

  // Forward / back — on ground: direct control; in air: gentle steering
  const moving = keys['ArrowUp'] || keys['w'] || keys['ArrowDown'] || keys['s'] || Math.abs(joy.y) > 0.25;
  if (onGround) {
    velX = 0; velZ = 0;
    const fwd = (keys['ArrowUp']   || keys['w']) ? 1 : (joy.y < -0.25 ? -joy.y : 0);
    const bwd = (keys['ArrowDown'] || keys['s']) ? 1 : (joy.y >  0.25 ?  joy.y : 0);
    if (fwd) { velX = -Math.sin(puppy.rotation.y) * MOVE_SPEED * fwd; velZ = -Math.cos(puppy.rotation.y) * MOVE_SPEED * fwd; }
    if (bwd) { velX =  Math.sin(puppy.rotation.y) * MOVE_SPEED * bwd; velZ =  Math.cos(puppy.rotation.y) * MOVE_SPEED * bwd; }
  } else {
    // air steering
    const fwd = (keys['ArrowUp']   || keys['w']) ? 1 : (joy.y < -0.25 ? -joy.y : 0);
    const bwd = (keys['ArrowDown'] || keys['s']) ? 1 : (joy.y >  0.25 ?  joy.y : 0);
    if (fwd) { velX += -Math.sin(puppy.rotation.y) * MOVE_SPEED * AIR_CONTROL * fwd; velZ += -Math.cos(puppy.rotation.y) * MOVE_SPEED * AIR_CONTROL * fwd; }
    if (bwd) { velX +=  Math.sin(puppy.rotation.y) * MOVE_SPEED * AIR_CONTROL * bwd; velZ +=  Math.cos(puppy.rotation.y) * MOVE_SPEED * AIR_CONTROL * bwd; }
    // cap air speed
    const spd = Math.sqrt(velX * velX + velZ * velZ);
    if (spd > MOVE_SPEED * 1.8) { velX *= MOVE_SPEED * 1.8 / spd; velZ *= MOVE_SPEED * 1.8 / spd; }
  }
  puppy.position.x += velX;
  puppy.position.z += velZ;

  // Jump — carry current ground velocity into the air
  if ((keys[' '] || touchJump) && onGround) {
    velY = JUMP_FORCE;
    onGround = false;
  }
  velY -= GRAVITY;
  puppy.position.y += velY;
  if (puppy.position.y <= 0.75) {
    puppy.position.y = 0.75;
    velY = 0;
    // bleed off horizontal momentum on landing
    velX *= GROUND_DRAG;
    velZ *= GROUND_DRAG;
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

    // Shadow blob — tracks XZ of leaf, fades + shrinks with height
    const heightRatio = Math.max(0, Math.min(1, 1 - l.position.y / LEAF_MAX_Y));
    d.shadow.position.x = l.position.x;
    d.shadow.position.z = l.position.z;
    d.shadow.material.opacity = heightRatio * 0.45;
    const s = 0.3 + heightRatio * 0.9;
    d.shadow.scale.set(s, s, s);

    // Settle on ground instead of removing
    if (l.position.y < 0) {
      settleLeaf(l);
      leaves[i] = spawnLeaf(false);
      continue;
    }

    // Collision with puppy — caught!
    const dx = puppy.position.x - l.position.x;
    const dy = puppy.position.y - l.position.y;
    const dz = puppy.position.z - l.position.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < PUPPY_RADIUS + 0.4) {
      removeLeaf(l);
      leaves[i] = spawnLeaf(false);
      score++;
      scoreEl.innerText = score;
    }
  }

  // Scatter ground leaves when puppy runs through them
  if (moving || !onGround) scatterNearby(puppy.position.x, puppy.position.z);

  // Update airborne ground leaves
  for (const gl of groundLeaves) {
    if (gl.state !== 'airborne') continue;
    gl.vy -= 0.006;
    gl.mesh.position.x += gl.vx;
    gl.mesh.position.y += gl.vy;
    gl.mesh.position.z += gl.vz;
    gl.mesh.rotation.y += 0.06;
    if (gl.mesh.position.y <= 0.04) {
      gl.mesh.position.y = 0.04;
      gl.mesh.rotation.x = -Math.PI / 2;
      gl.mesh.rotation.y = Math.random() * Math.PI * 2;
      gl.mesh.rotation.z = 0;
      gl.state = 'settled';
      gl.vx = 0; gl.vy = 0; gl.vz = 0;
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
