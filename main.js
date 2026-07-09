import * as THREE from 'three';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -14, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, -5, 10);
scene.add(dirLight);

// --- Constants ---
const BOARD_W = 14;
const BOARD_H = 16;
const PADDLE_SPEED = 0.18;
const BALL_SPEED_INIT = 0.13;

// --- Paddle ---
const paddle = new THREE.Mesh(
  new THREE.BoxGeometry(3, 0.6, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.2 })
);
paddle.position.set(0, -7, 0.3);
scene.add(paddle);

// --- Ball ---
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0022 })
);
ball.position.set(0, -5, 0.3);
scene.add(ball);

let ballVel = { x: BALL_SPEED_INIT * 0.8, y: BALL_SPEED_INIT };

// --- Bricks ---
const bricks = [];
const ROWS = 4, COLS = 7;
const BRICK_W = 1.6, BRICK_H = 0.6;

function buildBricks() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const brick = new THREE.Mesh(
        new THREE.BoxGeometry(BRICK_W, BRICK_H, 0.5),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${r * 40 + 160}, 100%, 50%)`) })
      );
      brick.position.set(
        (c - (COLS - 1) / 2) * (BRICK_W + 0.2),
        4 - r * (BRICK_H + 0.3),
        0.25
      );
      scene.add(brick);
      bricks.push(brick);
    }
  }
}
buildBricks();

// --- Walls (visual border) ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.8 });
const wallThick = 0.4;
[
  { pos: [-(BOARD_W / 2 + wallThick / 2), 0, 0], size: [wallThick, BOARD_H, 1] },
  { pos: [(BOARD_W / 2 + wallThick / 2), 0, 0],  size: [wallThick, BOARD_H, 1] },
  { pos: [0, BOARD_H / 2 + wallThick / 2, 0],    size: [BOARD_W + wallThick * 2, wallThick, 1] },
].forEach(({ pos, size }) => {
  const w = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
  w.position.set(...pos);
  scene.add(w);
});

// --- Game State ---
let score = 0;
let lives = 3;
let gameOver = false;
let won = false;

const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

function showMessage(text) {
  msgEl.innerHTML = text;
  msgEl.style.display = 'block';
}

function resetBall() {
  ball.position.set(0, -3, 0.3);
  ballVel = { x: BALL_SPEED_INIT * 0.8, y: BALL_SPEED_INIT };
}

// --- Controls ---
const keys = { Left: false, Right: false };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.Left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.Right = true;
  // Restart on R
  if ((e.key === 'r' || e.key === 'R') && (gameOver || won)) restartGame();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.Left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.Right = false;
});

function restartGame() {
  bricks.forEach(b => scene.remove(b));
  bricks.length = 0;
  buildBricks();
  score = 0;
  lives = 3;
  gameOver = false;
  won = false;
  scoreEl.innerText = score;
  msgEl.style.display = 'none';
  paddle.position.set(0, -7, 0.3);
  resetBall();
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  if (!gameOver && !won) {
    // Paddle movement
    if (keys.Left && paddle.position.x > -BOARD_W / 2 + 1.6) paddle.position.x -= PADDLE_SPEED;
    if (keys.Right && paddle.position.x < BOARD_W / 2 - 1.6)  paddle.position.x += PADDLE_SPEED;

    // Ball movement
    ball.position.x += ballVel.x;
    ball.position.y += ballVel.y;

    // Wall collisions (left / right / top)
    if (ball.position.x < -BOARD_W / 2 + 0.3) { ball.position.x = -BOARD_W / 2 + 0.3; ballVel.x = Math.abs(ballVel.x); }
    if (ball.position.x >  BOARD_W / 2 - 0.3) { ball.position.x =  BOARD_W / 2 - 0.3; ballVel.x = -Math.abs(ballVel.x); }
    if (ball.position.y > BOARD_H / 2) { ball.position.y = BOARD_H / 2; ballVel.y = -Math.abs(ballVel.y); }

    // Paddle collision
    const py = paddle.position.y;
    if (ball.position.y >= py - 0.5 && ball.position.y <= py + 0.5 && ballVel.y < 0) {
      if (Math.abs(ball.position.x - paddle.position.x) < 1.65) {
        ballVel.y = Math.abs(ballVel.y);
        ballVel.x = (ball.position.x - paddle.position.x) * 0.12;
      }
    }

    // Brick collisions
    for (let i = bricks.length - 1; i >= 0; i--) {
      const b = bricks[i];
      const dx = Math.abs(ball.position.x - b.position.x);
      const dy = Math.abs(ball.position.y - b.position.y);
      if (dx < BRICK_W / 2 + 0.3 && dy < BRICK_H / 2 + 0.3) {
        scene.remove(b);
        bricks.splice(i, 1);
        // Determine which face was hit for realistic bounce
        if (dx / (BRICK_W / 2) > dy / (BRICK_H / 2)) ballVel.x *= -1;
        else ballVel.y *= -1;
        score += 10;
        scoreEl.innerText = score;
        break;
      }
    }

    // Win condition
    if (bricks.length === 0) {
      won = true;
      showMessage('You Win!<br><small style="font-size:18px">Press R to play again</small>');
    }

    // Lose a life / game over
    if (ball.position.y < -BOARD_H / 2) {
      lives--;
      if (lives <= 0) {
        gameOver = true;
        showMessage('Game Over<br><small style="font-size:18px">Press R to restart</small>');
      } else {
        resetBall();
      }
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
