interface Runner {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  grounded: boolean;
  ducking: boolean;
  wobble: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "tower" | "low" | "float";
  passed: boolean;
}

interface Pickup {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  phrase: string;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
}

type GameMode = "ready" | "running" | "paused" | "gameOver";

const canvasElement = document.querySelector<HTMLCanvasElement>("#game");
const scoreElementCandidate = document.querySelector<HTMLElement>("#score");
const bestElementCandidate = document.querySelector<HTMLElement>("#best");
const moodElementCandidate = document.querySelector<HTMLElement>("#mood");
const overlayCandidate = document.querySelector<HTMLElement>("#overlay");
const overlayCopyCandidate = document.querySelector<HTMLElement>("#overlay-copy");
const startButtonCandidate = document.querySelector<HTMLButtonElement>("#start");

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

const canvas: HTMLCanvasElement = canvasElement;
const scoreElement: HTMLElement = scoreElementCandidate;
const bestElement: HTMLElement = bestElementCandidate;
const moodElement: HTMLElement = moodElementCandidate;
const overlay: HTMLElement = overlayCandidate;
const overlayCopy: HTMLElement = overlayCopyCandidate;
const startButton: HTMLButtonElement = startButtonCandidate;

const renderingContext = canvas.getContext("2d");

if (!renderingContext) {
  throw new Error("Canvas is not supported");
}

const ctx: CanvasRenderingContext2D = renderingContext;

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

const runner: Runner = {
  x: 126,
  y: world.groundY - 86,
  width: 76,
  height: 86,
  vy: 0,
  grounded: true,
  ducking: false,
  wobble: 0,
};

let mode: GameMode = "ready";
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

const keys = new Set<string>();
const obstacles: Obstacle[] = [];
const pickups: Pickup[] = [];
const clouds: Cloud[] = [
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

window.addEventListener("keydown", (event: KeyboardEvent) => {
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

window.addEventListener("keyup", (event: KeyboardEvent) => {
  keys.delete(event.key.toLowerCase());
});

requestAnimationFrame(loop);

function loop(time: number): void {
  const delta = Math.min((time - lastTime) / 1000 || 0, 0.033);
  lastTime = time;

  if (mode === "running") {
    update(delta);
  }

  draw();
  requestAnimationFrame(loop);
}

function resetGame(): void {
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

function setPaused(paused: boolean): void {
  mode = paused ? "paused" : "running";
  overlay.hidden = !paused;
  overlayCopy.textContent = "Paused for dramatic canon consultation.";
  startButton.textContent = "Resume";
}

function update(delta: number): void {
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

function updateRunner(delta: number): void {
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

function updateClouds(delta: number): void {
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * delta;
    if (cloud.x < -140) {
      cloud.x = world.width + 80;
      cloud.y = 45 + Math.random() * 100;
    }
  }
}

function updateObstacles(delta: number): void {
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

function updatePickups(delta: number): void {
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

function spawnObstacle(): void {
  const roll = Math.random();
  const kind: Obstacle["kind"] = roll > 0.72 ? "float" : roll > 0.45 ? "low" : "tower";
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

function spawnPickup(): void {
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

function checkCollisions(): void {
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

function endGame(): void {
  mode = "gameOver";
  best = Math.max(best, score);
  localStorage.setItem("mommy-ball-best", String(best));
  bestElement.textContent = String(best);
  overlay.hidden = false;
  overlayCopy.textContent = `${canonHooks.runnerName} bonked into canon at ${score} points.`;
  startButton.textContent = "Run Again";
  updateHud();
}

function updateMood(delta: number): void {
  moodTimer -= delta;
  if (moodTimer <= 0) {
    currentMood = canonHooks.moods[Math.floor(distance / 700) % canonHooks.moods.length];
    moodTimer = 1;
  }
}

function updateHud(): void {
  scoreElement.textContent = String(score);
  bestElement.textContent = String(best);
  moodElement.textContent =
    mode === "paused" ? "Paused" : mode === "gameOver" ? "Bonked" : currentMood;
}

function draw(): void {
  ctx.clearRect(0, 0, world.width, world.height);
  drawSky();
  drawGround();
  drawPickups();
  drawObstacles();
  drawRunner();
}

function drawSky(): void {
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

function drawCloud(cloud: Cloud): void {
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

function drawGround(): void {
  ctx.fillStyle = "#65b96e";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);
  ctx.fillStyle = "#3d8f50";
  for (let x = -((distance * 0.3) % 56); x < world.width; x += 56) {
    ctx.fillRect(x, world.groundY + 28, 34, 8);
  }
  ctx.fillStyle = "#4a3428";
  ctx.fillRect(0, world.groundY, world.width, 8);
}

function drawRunner(): void {
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

function drawObstacles(): void {
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

function drawPickups(): void {
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

function roundRect(x: number, y: number, width: number, height: number, radius: number): void {
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

function removeOffscreen(items: Array<{ x: number; width?: number; radius?: number }>): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const padding = item.width ?? item.radius ?? 0;
    if (item.x + padding < -80 || ("collected" in item && item.collected)) {
      items.splice(index, 1);
    }
  }
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleRectOverlap(
  circle: Pickup,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isJumpPressed(): boolean {
  return keys.has(" ") || keys.has("arrowup") || keys.has("w");
}

function isJumpKey(key: string): boolean {
  return key === " " || key === "arrowup" || key === "w";
}
