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

type GameMode = "ready" | "running" | "paused" | "gameOver";
type SpriteKey = "mommyBall" | "goatbox" | "slurpSlurp" | "frank" | "openTheCloset" | "ticket";
type EnvironmentSpriteKey =
  | "cloudHills"
  | "housePink"
  | "houseLavender"
  | "houseYellow"
  | "houseBlue"
  | "school"
  | "rail"
  | "fence"
  | "sign"
  | "shrubLarge"
  | "shrubRound"
  | "shrubFlowers"
  | "treeRound"
  | "treeTall"
  | "treeFlower"
  | "treeBlue"
  | "treeSmall";

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
  groundY: 468,
  trainY: 346,
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

const backgroundImage = new Image();
backgroundImage.src = "/assets/generated/ballseat-town-elements.png";
backgroundImage.addEventListener("load", () => {
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

const environmentFrames: Record<EnvironmentSpriteKey, SpriteFrame> = {
  cloudHills: { x: 1053, y: 690, width: 590, height: 207 },
  housePink: { x: 46, y: 141, width: 216, height: 222 },
  houseLavender: { x: 300, y: 157, width: 259, height: 205 },
  houseYellow: { x: 604, y: 161, width: 257, height: 206 },
  houseBlue: { x: 900, y: 165, width: 272, height: 202 },
  school: { x: 1201, y: 30, width: 453, height: 335 },
  rail: { x: 52, y: 413, width: 762, height: 111 },
  fence: { x: 866, y: 432, width: 419, height: 113 },
  sign: { x: 1365, y: 413, width: 238, height: 218 },
  shrubLarge: { x: 57, y: 563, width: 181, height: 85 },
  shrubRound: { x: 294, y: 559, width: 143, height: 93 },
  shrubFlowers: { x: 509, y: 578, width: 238, height: 78 },
  treeRound: { x: 48, y: 685, width: 195, height: 211 },
  treeTall: { x: 292, y: 685, width: 155, height: 209 },
  treeFlower: { x: 499, y: 692, width: 159, height: 202 },
  treeBlue: { x: 702, y: 697, width: 157, height: 198 },
  treeSmall: { x: 900, y: 731, width: 132, height: 163 },
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
  drawBackground();
  drawTown();
  drawOpenTheCloset();
  drawTrackLayer();
  drawForegroundLane();
  drawPickups();
  drawObstacles();
  drawRunner();
}

function drawBackground(): void {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, world.height);
  skyGradient.addColorStop(0, "#a9ddf0");
  skyGradient.addColorStop(0.62, "#dff4ef");
  skyGradient.addColorStop(1, "#cbeec7");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, world.width, world.height);

  drawRepeatingEnvironment("cloudHills", 238, 355, 124, 0.2, 470, 70);
}

function drawOpenTheCloset(): void {
  const x = world.width - ((distance * 0.55) % (world.width + 680));

  drawSprite("openTheCloset", x - 8, world.trainY - 78, 210, 154);
}

function drawTown(): void {
  const townSpeed = distance * 0.55;
  const patternWidth = 1080;
  const startX = -((townSpeed + 40) % patternWidth) - patternWidth;
  const rows: Array<[EnvironmentSpriteKey, number, number, number, number]> = [
    ["housePink", 20, 236, 150, 154],
    ["houseLavender", 210, 236, 176, 139],
    ["houseYellow", 435, 230, 170, 137],
    ["houseBlue", 655, 232, 178, 132],
    ["school", 860, 196, 235, 174],
    ["sign", 1118, 270, 130, 120],
  ];

  for (let x = startX; x < world.width + patternWidth; x += patternWidth) {
    for (const [sprite, offsetX, y, width, height] of rows) {
      drawEnvironmentSprite(sprite, x + offsetX, y, width, height);
    }
  }
}

function drawTrackLayer(): void {
  drawRepeatingEnvironment("rail", 354, 500, 73, 0.72, 0, 0);
  drawRepeatingEnvironment("fence", 385, 300, 81, 0.66, 155, 120);
}

function drawForegroundLane(): void {
  ctx.fillStyle = "#bfe7c0";
  ctx.fillRect(0, 426, world.width, world.height - 426);

  ctx.fillStyle = "rgba(113, 153, 128, 0.34)";
  const dashWidth = 32;
  const dashGap = 28;
  const dashPattern = dashWidth + dashGap;
  const dashStart = -((distance * 0.98) % dashPattern);
  for (let x = dashStart; x < world.width; x += dashPattern) {
    ctx.fillRect(x, 497, dashWidth, 7);
  }

  drawRepeatingEnvironment("shrubLarge", 414, 130, 61, 0.9, 360, 20);
  drawRepeatingEnvironment("shrubFlowers", 421, 164, 54, 0.92, 440, 260);
  drawRepeatingEnvironment("treeSmall", 368, 70, 86, 0.88, 620, 470);
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

function drawEnvironmentSprite(
  sprite: EnvironmentSpriteKey,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const frame = environmentFrames[sprite];
  if (!backgroundImage.complete || backgroundImage.naturalWidth === 0) {
    return;
  }

  ctx.drawImage(backgroundImage, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
}

function drawRepeatingEnvironment(
  sprite: EnvironmentSpriteKey,
  y: number,
  width: number,
  height: number,
  speedFactor: number,
  spacing: number,
  offset: number,
): void {
  const stride = width + spacing;
  const startX = -((distance * speedFactor + offset) % stride) - stride;
  for (let x = startX; x < world.width + stride; x += stride) {
    drawEnvironmentSprite(sprite, x, y, width, height);
  }
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
