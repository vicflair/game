import * as THREE from 'three';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8cce0);

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

// A few static trees for depth — varied sizes for a natural feel
const TREE_COLORS = [0xe8724a, 0xc1663a, 0xe8a030, 0xd4522a, 0x8b9e5a, 0xcc7722];

const treePositions = [];

function makeTree(x, z, scale = 1) {
  treePositions.push({ x, z });
  const g = new THREE.Group();
  const trunkH = 4.0 * scale;
  const trunk = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, trunkH, 8), toonMat(0x5d3a1a)));
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const canopyR = 2.6 * scale;
  const color = TREE_COLORS[Math.floor(Math.random() * TREE_COLORS.length)];
  const canopy = withOutline(new THREE.Mesh(new THREE.SphereGeometry(canopyR, 8, 8), toonMat(color)));
  canopy.position.y = trunkH + canopyR * 0.7;
  canopy.castShadow = true;
  g.add(canopy);
  g.position.set(x, 0, z);
  scene.add(g);
}
[
  [-22, -18, 1.2], [24, -20, 1.0], [-26,  8, 1.3], [20, 14, 0.9],
  [ -8, -24, 1.1], [10, -26, 0.85], [-18, 22, 1.0], [22, 20, 1.2],
  [  0, -28, 1.15], [-28, -4, 0.95], [28, 2, 1.05], [6, 26, 1.1],
].forEach(([x, z, s]) => makeTree(x, z, s));

// --- Pond ---
const POND = { x: 8, z: 5, rx: 5.5, rz: 5.0 }; // ellipse bounds used for NPC avoidance

function inPond(x, z) {
  return ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2 < 1;
}

const pondGroup = new THREE.Group();

// Water surface
const water = new THREE.Mesh(
  new THREE.CircleGeometry(1, 48),
  new THREE.MeshToonMaterial({ color: 0x5b9bd5, roughness: 1.0 })
);
water.rotation.x = -Math.PI / 2;
water.scale.set(POND.rx, POND.rz, 1);
water.position.set(POND.x, 0.03, POND.z);
// Outline
const waterOutline = new THREE.Mesh(
  water.geometry,
  new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
);
waterOutline.scale.setScalar(1.04);
water.add(waterOutline);
scene.add(water);

// Lily pads
[[0, 1.2], [2.0, -0.8], [-1.8, 1.2], [-0.5, -1.2], [1.5, 1.5]].forEach(([lx, lz]) => {
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 8),
    new THREE.MeshToonMaterial({ color: 0x6aaa50, roughness: 1.0 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(POND.x + lx, 0.05, POND.z + lz);
  const padOutline = new THREE.Mesh(pad.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  padOutline.scale.setScalar(1.08);
  pad.add(padOutline);
  scene.add(pad);
});

// --- Puppy ---
function createPuppyMesh(bodyColor = 0xc1663a, darkColor = 0x3b1f0e, snoutColor = 0xe8906a) {
  const TERRA = bodyColor;
  const DARK  = darkColor;
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
  const snout = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), toonMat(snoutColor)));
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

// --- NPC Dogs ---
const NPC_CONFIGS = [
  { body: 0xe8a030, dark: 0x7a4a10, snout: 0xf0c060 }, // golden retriever
  { body: 0x2d2d2d, dark: 0x111111, snout: 0x555555 }, // black lab
];

function newRoamTarget() {
  let x, z;
  do { x = (Math.random() - 0.5) * 22; z = (Math.random() - 0.5) * 22; } while (inPond(x, z));
  return new THREE.Vector3(x, 0.75, z);
}

const npcDogs = NPC_CONFIGS.map(({ body, dark, snout }) => {
  const mesh = createPuppyMesh(body, dark, snout);
  let sx, sz;
  do { sx = (Math.random() - 0.5) * 16; sz = (Math.random() - 0.5) * 16; } while (inPond(sx, sz));
  mesh.position.set(sx, 0.75, sz);
  scene.add(mesh);
  return { mesh, target: newRoamTarget(), speed: 0.05 + Math.random() * 0.025, pauseTimer: 0 };
});

// --- Squirrels ---
function createSquirrelMesh() {
  const GREY   = 0x8a7060;
  const FLUFFY = 0xc4a882;
  const outer = new THREE.Group();
  const g = new THREE.Group();
  g.rotation.y = Math.PI / 2;
  outer.add(g);

  const body = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.25, 8, 8), toonMat(GREY)));
  body.rotation.z = Math.PI / 2;
  g.add(body);

  const head = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), toonMat(GREY)));
  head.position.set(0.32, 0.1, 0);
  g.add(head);

  // Pointy ears
  [-0.07, 0.07].forEach(z => {
    const ear = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.04), toonMat(GREY)));
    ear.position.set(0.3, 0.24, z);
    g.add(ear);
  });

  // Big fluffy tail
  const tail = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), toonMat(FLUFFY)));
  tail.position.set(-0.32, 0.22, 0);
  g.add(tail);

  outer.position.y = 0.3;
  return outer;
}

function nearestTree(x, z) {
  let best = treePositions[0];
  let bestDist = Infinity;
  for (const tp of treePositions) {
    const d = Math.hypot(tp.x - x, tp.z - z);
    if (d < bestDist) { bestDist = d; best = tp; }
  }
  return best;
}

function randomFieldPos() {
  let x, z;
  do { x = (Math.random() - 0.5) * 30; z = (Math.random() - 0.5) * 30; } while (inPond(x, z));
  return { x, z };
}

// States: 'roam' | 'flee' | 'climbing' | 'hiding'
const squirrels = Array.from({ length: 3 }, () => {
  const mesh = createSquirrelMesh();
  const pos = randomFieldPos();
  mesh.position.set(pos.x, 0.3, pos.z);
  scene.add(mesh);
  return {
    mesh,
    state: 'roam',
    target: randomFieldPos(),
    hideTimer: 0,
    pauseTimer: Math.random() * 2,
  };
});

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
    (Math.random() - 0.5) * 50,
    startY,
    (Math.random() - 0.5) * 50
  );
  leaf.userData = {
    swayOffset: Math.random() * Math.PI * 2,
    swaySpeed:  0.6 + Math.random() * 0.5,
    fallSpeed:  0.018 + Math.random() * 0.012,
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
  fallingLeaf.rotation.set(0, Math.random() * Math.PI * 2, 0);
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
const ROT_SPEED  = 0.025;
let velY  = 0;
let velX  = 0;
let velZ  = 0;
let onGround = true;
const GRAVITY       = 0.009;
const JUMP_FORCE    = 0.16;
const AIR_CONTROL   = 0.08;
const GROUND_DRAG   = 0.75;

// --- Music ---
// Doo-wop progression: A maj → F# min → B min → E maj (I–vi–ii–V in A)
let musicCtx = null;
let masterGain = null;
let muted = false;

const PROGRESSION = [
  { bass: 110.00, voices: [220.00, 277.18, 329.63, 440.00] }, // A  maj: A2 | A3 C#4 E4 A4
  { bass:  92.50, voices: [185.00, 220.00, 277.18, 369.99] }, // F# min: F#2 | F#3 A3 C#4 F#4
  { bass: 123.47, voices: [246.94, 293.66, 369.99, 493.88] }, // B  min: B2 | B3 D4 F#4 B4
  { bass:  82.41, voices: [164.81, 207.65, 246.94, 329.63] }, // E  maj: E2 | E3 G#3 B3 E4
];

function initMusic() {
  if (musicCtx) return;
  musicCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = musicCtx.createGain();
  masterGain.gain.value = 0.75;
  masterGain.connect(musicCtx.destination);

  // Warm delay reverb
  const delay = musicCtx.createDelay(0.6);
  delay.delayTime.value = 0.28;
  const fbGain = musicCtx.createGain();
  fbGain.gain.value = 0.22;
  const wetGain = musicCtx.createGain();
  wetGain.gain.value = 0.18;
  delay.connect(fbGain);
  fbGain.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(masterGain);

  function note(freq, start, dur, vol, type = 'sine') {
    const osc = musicCtx.createOscillator();
    const g   = musicCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(masterGain);
    g.connect(delay);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.08);
    g.gain.setValueAtTime(vol, start + dur - 0.25);
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  const BPM = 72;
  const BEAT = 60 / BPM;
  const CHORD = BEAT * 4;
  const LOOP  = CHORD * PROGRESSION.length;

  function scheduleLoop(t0) {
    PROGRESSION.forEach((chord, i) => {
      const t = t0 + i * CHORD;
      const v = chord.voices;

      // BOOM: bass on beats 1 and 3 (long, warm)
      note(chord.bass, t,            BEAT * 0.82, 0.30, 'triangle');
      note(chord.bass, t + BEAT * 2, BEAT * 0.82, 0.25, 'triangle');

      // DOO / WOP: short punchy chord stabs on beats 2 and 4
      v.forEach(f => note(f, t + BEAT,     BEAT * 0.42, 0.072));
      v.forEach(f => note(f, t + BEAT * 3, BEAT * 0.42, 0.072));
    });
    // Re-schedule just before loop end
    const ms = (t0 + LOOP - musicCtx.currentTime - 0.6) * 1000;
    setTimeout(() => scheduleLoop(t0 + LOOP), Math.max(0, ms));
  }

  scheduleLoop(musicCtx.currentTime + 0.2);
}

// Start on first interaction, toggle with mute button
function onFirstInteraction() { initMusic(); }
window.addEventListener('keydown',   onFirstInteraction, { once: true });
window.addEventListener('touchstart', onFirstInteraction, { once: true });

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  initMusic(); // in case first interaction was the mute button
  muted = !muted;
  masterGain.gain.value = muted ? 0 : 0.45;
  muteBtn.textContent = muted ? '♪̶' : '♪';
});

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
  if (inPond(puppy.position.x, puppy.position.z)) {
    puppy.position.x -= velX;
    puppy.position.z -= velZ;
    velX = 0; velZ = 0;
  }

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
      gl.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
      gl.state = 'settled';
      gl.vx = 0; gl.vy = 0; gl.vz = 0;
    }
  }

  // Squirrels
  for (const sq of squirrels) {
    const mx = sq.mesh.position.x, mz = sq.mesh.position.z;
    const puppyDist = Math.hypot(puppy.position.x - mx, puppy.position.z - mz);

    if (sq.state === 'roam') {
      // Notice puppy if close
      if (puppyDist < 5.5) {
        sq.state = 'flee';
        const tree = nearestTree(mx, mz);
        sq.target = { x: tree.x, z: tree.z };
      } else {
        // Wander slowly
        if (sq.pauseTimer > 0) { sq.pauseTimer -= 0.016; continue; }
        const dx = sq.target.x - mx, dz = sq.target.z - mz;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.5) {
          sq.pauseTimer = 1.0 + Math.random() * 3;
          sq.target = randomFieldPos();
        } else {
          const angle = Math.atan2(-dx, -dz);
          let diff = angle - sq.mesh.rotation.y;
          while (diff >  Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sq.mesh.rotation.y += diff * 0.1;
          const sx = sq.mesh.position.x + (dx / dist) * 0.04;
          const sz = sq.mesh.position.z + (dz / dist) * 0.04;
          if (inPond(sx, sz)) { sq.target = randomFieldPos(); } else {
            sq.mesh.position.x = sx; sq.mesh.position.z = sz;
          }
          const b = 1 + Math.sin(t * 14) * 0.07;
          sq.mesh.scale.set(b, 1 / b, b);
        }
      }

    } else if (sq.state === 'flee') {
      const dx = sq.target.x - mx, dz = sq.target.z - mz;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) {
        sq.state = 'climbing';
      } else {
        const angle = Math.atan2(-dx, -dz);
        let diff = angle - sq.mesh.rotation.y;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        sq.mesh.rotation.y += diff * 0.15;
        sq.mesh.position.x += (dx / dist) * 0.18;
        sq.mesh.position.z += (dz / dist) * 0.18;
        const b = 1 + Math.sin(t * 20) * 0.08;
        sq.mesh.scale.set(b, 1 / b, b);
      }

    } else if (sq.state === 'climbing') {
      // Shrink into the tree
      sq.mesh.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), 0.1);
      if (sq.mesh.scale.x < 0.05) {
        sq.state = 'hiding';
        sq.hideTimer = 4 + Math.random() * 4;
        sq.mesh.position.set(999, 0.3, 999); // offscreen
      }

    } else if (sq.state === 'hiding') {
      sq.hideTimer -= 0.016;
      if (sq.hideTimer <= 0) {
        const pos = randomFieldPos();
        sq.mesh.position.set(pos.x, 0.3, pos.z);
        sq.mesh.scale.set(1, 1, 1);
        sq.target = randomFieldPos();
        sq.state = 'roam';
      }
    }
  }

  // NPC dogs — simple roam AI
  for (const npc of npcDogs) {
    if (npc.pauseTimer > 0) {
      npc.pauseTimer -= 0.016;
      npc.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.15);
      continue;
    }
    const dx = npc.target.x - npc.mesh.position.x;
    const dz = npc.target.z - npc.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.6) {
      npc.pauseTimer = 1.0 + Math.random() * 2.5;
      npc.target = newRoamTarget();
    } else {
      // smooth rotation toward target
      const targetAngle = Math.atan2(-dx, -dz);
      let diff = targetAngle - npc.mesh.rotation.y;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.mesh.rotation.y += diff * 0.07;
      // move — reroute if heading into pond
      const nx = npc.mesh.position.x + (dx / dist) * npc.speed;
      const nz = npc.mesh.position.z + (dz / dist) * npc.speed;
      if (inPond(nx, nz)) { npc.target = newRoamTarget(); } else {
        npc.mesh.position.x = nx; npc.mesh.position.z = nz;
      }
      // walk bounce
      const b = 1 + Math.sin(t * 10) * 0.06;
      npc.mesh.scale.set(b, 1 / b, b);
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
