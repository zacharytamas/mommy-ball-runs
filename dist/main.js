const canvasElement = document.querySelector("#game");
const scoreElementCandidate = document.querySelector("#score");
const bestElementCandidate = document.querySelector("#best");
const moodElementCandidate = document.querySelector("#mood");
const overlayCandidate = document.querySelector("#overlay");
const overlayCopyCandidate = document.querySelector("#overlay-copy");
const startButtonCandidate = document.querySelector("#start");

if (
  !canvasElement ||
  !scoreElementCandidate ||
  !bestElementCandidate ||
  !moodElementCandidate ||
  !overlayCandidate ||
  !overlayCopyCandidate ||
  !startButtonCandidate
) {
  throw new Error("Missing game markup");
}

const canvas = canvasElement;
const scoreElement = scoreElementCandidate;
const bestElement = bestElementCandidate;
const moodElement = moodElementCandidate;
const overlay = overlayCandidate;
const overlayCopy = overlayCopyCandidate;
const startButton = startButtonCandidate;

const renderingContext = canvas.getContext("2d");

if (!renderingContext) {
  throw new Error("Canvas is not supported");
}

const ctx = renderingContext;

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: 416,
  gravity: 2200,
  jumpVelocity: -820,
  baseSpeed: 360,
};

const canonHooks = {
  runnerName: "Mommy Ball",
  moods: ["Zooming", "Rolling", "Determined", "Snack-powered", "Majestic"],
  pickupPhrases: ["plot twist", "deep lore", "canon event", "silly decree", "forbidden snack"],
};

const runner = {
  x: 126,
  y: world.groundY - 86,
  width: 76,
  height: 86,
  vy: 0,
  grounded: true,
  ducking: false,
  wobble: 0,
};

let mode = "ready";
let lastTime = 0;
let score = 0;
let bonusScore = 0;
let best = Number(localStorage.getItem("mommy-ball-best") ?? 0);
let distance = 0;
let obstacleTimer = 0;
let pickupTimer = 0;
let moodTimer = 0;
let currentMood = "Ready";
let speed = world.baseSpeed;

const keys = new Set();
const obstacles = [];
const pickups = [];
const clouds = [
  { x: 90, y: 80, speed: 12, scale: 1.2 },
  { x: 430, y: 54, speed: 20, scale: 0.8 },
  { x: 760, y: 112, speed: 16, scale: 1 },
];

bestElement.textContent = String(best);
draw();

startButton.addEventListener("click", () => {
  if (mode === "running") return;
  resetGame();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if ([" ", "arrowup", "arrowdown"].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }

  keys.add(key);

  if (mode === "ready" && isJumpKey(key)) {
    resetGame();
  } else if (mode === "gameOver" && (key === "r" || isJumpKey(key))) {
    resetGame();
  } else if (key === "p" && mode === "running") {
    setPaused(true);
  } else if (key === "p" && mode === "paused") {
    setPaused(false);
  } else if (key === "r") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

requestAnimationFrame(loop);

function loop(time) {
  const delta = Math.min((time - lastTime) / 1000 || 0, 0.033);
  lastTime = time;

  if (mode === "running") {
    update(delta);
  }

  draw();
  requestAnimationFrame(loop);
}

function resetGame() {
  mode = "running";
  score = 0;
  bonusScore = 0;
  distance = 0;
  speed = world.baseSpeed;
  obstacleTimer = 0.85;
  pickupTimer = 1.35;
  moodTimer = 0;
  currentMood = "Zooming";
  obstacles.length = 0;
  pickups.length = 0;
  runner.y = world.groundY - runner.height;
  runner.vy = 0;
  runner.grounded = true;
  runner.ducking = false;
  overlay.hidden = true;
  updateHud();
}

function setPaused(paused) {
  mode = paused ? "paused" : "running";
  overlay.hidden = !paused;
  overlayCopy.textContent = "Paused for dramatic canon consultation.";
  startButton.textContent = "Resume";
}

function update(delta) {
  distance += speed * delta;
  speed = world.baseSpeed + Math.min(270, distance * 0.025);
  score = Math.floor(distance / 10) + bonusScore;

  updateRunner(delta);
  updateClouds(delta);
  updateObstacles(delta);
  updatePickups(delta);
  checkCollisions();
  updateMood(delta);
  updateHud();
}

function updateRunner(delta) {
  runner.ducking = keys.has("arrowdown") || keys.has("s");
  const targetHeight = runner.ducking && runner.grounded ? 58 : 86;
  const oldBottom = runner.y + runner.height;
  runner.height += (targetHeight - runner.height) * Math.min(1, delta * 18);
  runner.y = oldBottom - runner.height;

  if (isJumpPressed() && runner.grounded && !runner.ducking) {
    runner.vy = world.jumpVelocity;
    runner.grounded = false;
  }

  runner.vy += world.gravity * delta;
  runner.y += runner.vy * delta;

  const floor = world.groundY - runner.height;
  if (runner.y >= floor) {
    runner.y = floor;
    runner.vy = 0;
    runner.grounded = true;
  }

  runner.wobble += delta * (runner.grounded ? 10 : 5);
}

function updateClouds(delta) {
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * delta;
    if (cloud.x < -140) {
      cloud.x = world.width + 80;
      cloud.y = 45 + Math.random() * 100;
    }
  }
}

function updateObstacles(delta) {
  obstacleTimer -= delta;

  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = 0.72 + Math.random() * 0.9 - Math.min(0.28, distance / 9000);
  }

  for (const obstacle of obstacles) {
    obstacle.x -= speed * delta;
    if (!obstacle.passed && obstacle.x + obstacle.width < runner.x) {
      obstacle.passed = true;
      bonusScore += 25;
    }
  }

  removeOffscreen(obstacles);
}

function updatePickups(delta) {
  pickupTimer -= delta;

  if (pickupTimer <= 0) {
    spawnPickup();
    pickupTimer = 1.8 + Math.random() * 2.2;
  }

  for (const pickup of pickups) {
    pickup.x -= speed * delta;
  }

  removeOffscreen(pickups);
}

function spawnObstacle() {
  const roll = Math.random();
  const kind = roll > 0.72 ? "float" : roll > 0.45 ? "low" : "tower";
  const width = kind === "low" ? 78 : 52;
  const height = kind === "float" ? 54 : kind === "low" ? 42 : 92;
  const y = kind === "float" ? world.groundY - 154 : world.groundY - height;
  obstacles.push({
    x: world.width + 24,
    y,
    width,
    height,
    kind,
    passed: false,
  });
}

function spawnPickup() {
  const phrase =
    canonHooks.pickupPhrases[Math.floor(Math.random() * canonHooks.pickupPhrases.length)];
  pickups.push({
    x: world.width + 40,
    y: world.groundY - 138 - Math.random() * 74,
    radius: 16,
    collected: false,
    phrase,
  });
}

function checkCollisions() {
  const runnerBox = {
    x: runner.x + 12,
    y: runner.y + 10,
    width: runner.width - 24,
    height: runner.height - 12,
  };

  for (const obstacle of obstacles) {
    if (rectsOverlap(runnerBox, obstacle)) {
      endGame();
      return;
    }
  }

  for (const pickup of pickups) {
    if (!pickup.collected && circleRectOverlap(pickup, runnerBox)) {
      pickup.collected = true;
      bonusScore += 100;
      currentMood = pickup.phrase;
      moodTimer = 1.2;
    }
  }
}

function endGame() {
  mode = "gameOver";
  best = Math.max(best, score);
  localStorage.setItem("mommy-ball-best", String(best));
  bestElement.textContent = String(best);
  overlay.hidden = false;
  overlayCopy.textContent = `${canonHooks.runnerName} bonked into canon at ${score} points.`;
  startButton.textContent = "Run Again";
  updateHud();
}

function updateMood(delta) {
  moodTimer -= delta;
  if (moodTimer <= 0) {
    currentMood = canonHooks.moods[Math.floor(distance / 700) % canonHooks.moods.length];
    moodTimer = 1;
  }
}

function updateHud() {
  scoreElement.textContent = String(score);
  bestElement.textContent = String(best);
  moodElement.textContent =
    mode === "paused" ? "Paused" : mode === "gameOver" ? "Bonked" : currentMood;
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawSky();
  drawGround();
  drawPickups();
  drawObstacles();
  drawRunner();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.groundY);
  gradient.addColorStop(0, "#75c8e3");
  gradient.addColorStop(1, "#b5e8eb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#fffdf8";
  for (const cloud of clouds) {
    drawCloud(cloud);
  }

  ctx.fillStyle = "#ffe36d";
  ctx.beginPath();
  ctx.arc(820, 86, 36, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(cloud) {
  ctx.save();
  ctx.translate(cloud.x, cloud.y);
  ctx.scale(cloud.scale, cloud.scale);
  ctx.beginPath();
  ctx.arc(0, 20, 24, 0, Math.PI * 2);
  ctx.arc(28, 10, 30, 0, Math.PI * 2);
  ctx.arc(62, 22, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  ctx.fillStyle = "#65b96e";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);
  ctx.fillStyle = "#3d8f50";
  for (let x = -((distance * 0.3) % 56); x < world.width; x += 56) {
    ctx.fillRect(x, world.groundY + 28, 34, 8);
  }
  ctx.fillStyle = "#4a3428";
  ctx.fillRect(0, world.groundY, world.width, 8);
}

function drawRunner() {
  const cx = runner.x + runner.width / 2;
  const cy = runner.y + runner.height / 2;
  const squash = runner.ducking ? 1.18 : 1;
  const wobble = Math.sin(runner.wobble) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  ctx.scale(squash, 1 / squash);

  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#d66b13";
  ctx.beginPath();
  ctx.ellipse(-22, 42, 18, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(24, 42, 18, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-32, 8);
  ctx.quadraticCurveTo(-54, 28, -40, 44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(34, 6);
  ctx.quadraticCurveTo(54, 26, 42, 44);
  ctx.stroke();

  ctx.fillStyle = "#ee9500";
  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, runner.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(117, 61, 10, 0.28)";
  ctx.beginPath();
  ctx.arc(-7, 4, runner.width / 2 - 6, 0.2, Math.PI - 0.14);
  ctx.lineTo(-36, 11);
  ctx.fill();

  ctx.fillStyle = "#fff3c7";
  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-10, -12, 12, 18, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(20, -12, 12, 18, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#241f18";
  ctx.beginPath();
  ctx.ellipse(-6, -10, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, -10, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(9, 11);
  ctx.lineTo(30, 11);
  ctx.stroke();

  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.fillStyle =
      obstacle.kind === "float" ? "#7057d2" : obstacle.kind === "low" ? "#f0b84d" : "#d24f45";
    ctx.strokeStyle = "#241f18";
    ctx.lineWidth = 4;
    roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#241f18";
    if (obstacle.kind === "float") {
      ctx.fillRect(obstacle.x + 13, obstacle.y + 18, obstacle.width - 26, 8);
    } else if (obstacle.kind === "low") {
      ctx.fillRect(obstacle.x + 10, obstacle.y + 13, obstacle.width - 20, 7);
    } else {
      ctx.fillRect(obstacle.x + 14, obstacle.y + 20, obstacle.width - 28, 10);
      ctx.fillRect(obstacle.x + 14, obstacle.y + 48, obstacle.width - 28, 10);
    }
  }
}

function drawPickups() {
  for (const pickup of pickups) {
    if (pickup.collected) continue;
    ctx.fillStyle = "#fff071";
    ctx.strokeStyle = "#241f18";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#241f18";
    ctx.font = "900 16px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", pickup.x, pickup.y + 1);
  }
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function removeOffscreen(items) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const padding = item.width ?? item.radius ?? 0;
    if (item.x + padding < -80 || ("collected" in item && item.collected)) {
      items.splice(index, 1);
    }
  }
}

function rectsOverlap(
  a,
  b,
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleRectOverlap(
  circle,
  rect,
) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isJumpPressed() {
  return keys.has(" ") || keys.has("arrowup") || keys.has("w");
}

function isJumpKey(key) {
  return key === " " || key === "arrowup" || key === "w";
}
