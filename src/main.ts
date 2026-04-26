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
  kind: "goatbox" | "slurpSlurp" | "frank";
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
type SpriteKey = "mommyBall" | "goatbox" | "slurpSlurp" | "frank" | "openTheCloset" | "ticket";

interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  moods: [
    "Ballseat bound",
    "Train happy",
    "Castle insurance",
    "Island daydreaming",
    "Learning Elementary late",
  ],
  pickupPhrases: [
    "Open the Closet ticket",
    "Ballseat Island pass",
    "magic wand charge",
    "Frank sighting",
    "Slurp Slurp chorus",
    "hundred babies roll-call",
  ],
};

const spriteSheet = new Image();
spriteSheet.src = "/assets/generated/ballseat-sprite-sheet.png";
spriteSheet.addEventListener("load", () => {
  draw();
});

const spriteFrames: Record<SpriteKey, SpriteFrame> = {
  mommyBall: { x: 70, y: 122, width: 385, height: 332 },
  goatbox: { x: 580, y: 45, width: 340, height: 437 },
  slurpSlurp: { x: 1085, y: 199, width: 334, height: 269 },
  frank: { x: 53, y: 606, width: 423, height: 294 },
  openTheCloset: { x: 552, y: 600, width: 438, height: 320 },
  ticket: { x: 1075, y: 617, width: 421, height: 313 },
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
  const kind: Obstacle["kind"] = roll > 0.7 ? "frank" : roll > 0.34 ? "slurpSlurp" : "goatbox";
  const width = kind === "goatbox" ? 84 : kind === "slurpSlurp" ? 66 : 66;
  const height = kind === "goatbox" ? 108 : kind === "slurpSlurp" ? 52 : 46;
  const y = kind === "frank" ? world.groundY - 142 : world.groundY - height;
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
  overlayCopy.textContent = `${canonHooks.runnerName} bonked somewhere between Ballseat Town and Ballseat Island at ${score} points.`;
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
  drawBallseatTown();
  drawOpenTheCloset();
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

  ctx.fillStyle = "#7c6049";
  ctx.fillRect(0, world.groundY + 20, world.width, 10);
  ctx.fillRect(0, world.groundY + 56, world.width, 10);
  ctx.fillStyle = "#4a3428";
  for (let x = -((distance * 0.7) % 72); x < world.width; x += 72) {
    ctx.fillRect(x, world.groundY + 14, 12, 58);
  }

  ctx.fillStyle = "#3d8f50";
  for (let x = -((distance * 0.3) % 56); x < world.width; x += 56) {
    ctx.fillRect(x, world.groundY + 88, 34, 8);
  }
  ctx.fillStyle = "#4a3428";
  ctx.fillRect(0, world.groundY, world.width, 8);
}

function drawBallseatTown(): void {
  const townOffset = -((distance * 0.12) % 680);
  for (let x = townOffset - 120; x < world.width + 240; x += 680) {
    drawSchoolhouse(x + 70, world.groundY - 138);
    drawCastleHouse(x + 278, world.groundY - 126);
    drawBallseatSign(x + 478, world.groundY - 112);
  }

  const islandX = world.width - ((distance * 0.06) % (world.width + 420));
  ctx.fillStyle = "#4fb8a8";
  ctx.beginPath();
  ctx.ellipse(islandX + 160, world.groundY - 8, 150, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffcf55";
  ctx.beginPath();
  ctx.arc(islandX + 116, world.groundY - 74, 34, Math.PI, 0);
  ctx.lineTo(islandX + 150, world.groundY - 74);
  ctx.lineTo(islandX + 82, world.groundY - 74);
  ctx.fill();
}

function drawSchoolhouse(x: number, y: number): void {
  ctx.fillStyle = "#ffe6a3";
  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 4;
  roundRect(x, y + 36, 126, 80, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f05f3b";
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 42);
  ctx.lineTo(x + 63, y);
  ctx.lineTo(x + 134, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#85c9f0";
  ctx.fillRect(x + 18, y + 58, 24, 24);
  ctx.fillRect(x + 84, y + 58, 24, 24);
  ctx.fillStyle = "#241f18";
  ctx.font = "900 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("LEARNING", x + 63, y + 103);
}

function drawCastleHouse(x: number, y: number): void {
  ctx.fillStyle = "#f6b7d0";
  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 4;
  roundRect(x, y + 34, 120, 88, 5);
  ctx.fill();
  ctx.stroke();
  for (let tower = 0; tower < 3; tower += 1) {
    const towerX = x + tower * 42;
    ctx.fillRect(towerX + 2, y + 14, 34, 34);
    ctx.strokeRect(towerX + 2, y + 14, 34, 34);
    ctx.beginPath();
    ctx.moveTo(towerX - 1, y + 14);
    ctx.lineTo(towerX + 19, y - 8);
    ctx.lineTo(towerX + 39, y + 14);
    ctx.closePath();
    ctx.fillStyle = "#7057d2";
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#241f18";
  ctx.fillRect(x + 48, y + 82, 24, 40);
}

function drawBallseatSign(x: number, y: number): void {
  ctx.strokeStyle = "#241f18";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#8bd37b";
  roundRect(x, y, 150, 58, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#241f18";
  ctx.font = "900 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("BALLSEAT", x + 75, y + 25);
  ctx.font = "800 12px system-ui";
  ctx.fillText("TOWN", x + 75, y + 43);
  ctx.fillRect(x + 28, y + 58, 10, 48);
  ctx.fillRect(x + 112, y + 58, 10, 48);
}

function drawOpenTheCloset(): void {
  const x = world.width - ((distance * 0.42) % (world.width + 360));
  const y = world.groundY - 70;

  drawSprite("openTheCloset", x - 8, y - 78, 210, 154);
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
  drawSprite("mommyBall", -58, -52, 116, 100);
  ctx.restore();
}

function drawObstacles(): void {
  for (const obstacle of obstacles) {
    if (obstacle.kind === "goatbox") {
      drawGoatbox(obstacle);
    } else if (obstacle.kind === "slurpSlurp") {
      drawSlurpSlurp(obstacle);
    } else {
      drawFrank(obstacle);
    }
  }
}

function drawGoatbox(obstacle: Obstacle): void {
  drawSprite("goatbox", obstacle.x - 8, obstacle.y - 18, 100, 128);
}

function drawSlurpSlurp(obstacle: Obstacle): void {
  drawSprite("slurpSlurp", obstacle.x - 12, obstacle.y - 10, 90, 72);
}

function drawFrank(obstacle: Obstacle): void {
  drawSprite("frank", obstacle.x - 10, obstacle.y - 10, 86, 60);
}

function drawPickups(): void {
  for (const pickup of pickups) {
    if (pickup.collected) continue;
    drawSprite("ticket", pickup.x - 28, pickup.y - 20, 56, 40);
  }
}

function drawSprite(sprite: SpriteKey, x: number, y: number, width: number, height: number): void {
  const frame = spriteFrames[sprite];
  if (!spriteSheet.complete || spriteSheet.naturalWidth === 0) {
    return;
  }

  ctx.drawImage(spriteSheet, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
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
