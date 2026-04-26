export interface Runner {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  grounded: boolean;
  ducking: boolean;
  wobble: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "goatbox" | "slurpSlurp" | "frank";
  passed: boolean;
}

export interface Pickup {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  phrase: string;
}

export interface GameInput {
  jumpPressed: boolean;
  ducking: boolean;
}

export type GameMode = "ready" | "running" | "paused" | "gameOver";

export interface GameState {
  mode: GameMode;
  score: number;
  bonusScore: number;
  best: number;
  distance: number;
  speed: number;
  obstacleTimer: number;
  pickupTimer: number;
  moodTimer: number;
  currentMood: string;
  runner: Runner;
  obstacles: Obstacle[];
  pickups: Pickup[];
}

export const world = {
  width: 960,
  height: 540,
  groundY: 468,
  trainY: 346,
  gravity: 2200,
  jumpVelocity: -820,
  baseSpeed: 360,
};

export const canonHooks = {
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

export function createGameState(best = 0): GameState {
  return {
    mode: "ready",
    score: 0,
    bonusScore: 0,
    best,
    distance: 0,
    speed: world.baseSpeed,
    obstacleTimer: 0,
    pickupTimer: 0,
    moodTimer: 0,
    currentMood: "Ready",
    runner: createRunner(),
    obstacles: [],
    pickups: [],
  };
}

export function resetGame(state: GameState): void {
  state.mode = "running";
  state.score = 0;
  state.bonusScore = 0;
  state.distance = 0;
  state.speed = world.baseSpeed;
  state.obstacleTimer = 0.85;
  state.pickupTimer = 1.35;
  state.moodTimer = 0;
  state.currentMood = "Zooming";
  state.obstacles.length = 0;
  state.pickups.length = 0;
  Object.assign(state.runner, createRunner());
}

export function setPaused(state: GameState, paused: boolean): void {
  state.mode = paused ? "paused" : "running";
}

export function updateGame(
  state: GameState,
  delta: number,
  input: GameInput,
  random: () => number = Math.random,
): void {
  if (state.mode !== "running") return;

  state.distance += state.speed * delta;
  state.speed = world.baseSpeed + Math.min(270, state.distance * 0.025);
  state.score = Math.floor(state.distance / 10) + state.bonusScore;

  updateRunner(state.runner, delta, input);
  updateObstacles(state, delta, random);
  updatePickups(state, delta, random);
  checkCollisions(state);
  removeOffscreen(state.pickups);
  updateMood(state, delta);
}

export function runnerHitbox(runner: Runner): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: runner.x + 12,
    y: runner.y + 10,
    width: runner.width - 24,
    height: runner.height - 12,
  };
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function circleRectOverlap(
  circle: { x: number; y: number; radius: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function createRunner(): Runner {
  return {
    x: 126,
    y: world.groundY - 86,
    width: 76,
    height: 86,
    vy: 0,
    grounded: true,
    ducking: false,
    wobble: 0,
  };
}

function updateRunner(runner: Runner, delta: number, input: GameInput): void {
  runner.ducking = input.ducking;
  const targetHeight = runner.ducking && runner.grounded ? 58 : 86;
  const oldBottom = runner.y + runner.height;
  runner.height += (targetHeight - runner.height) * Math.min(1, delta * 18);
  runner.y = oldBottom - runner.height;

  if (input.jumpPressed && runner.grounded && !runner.ducking) {
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

function updateObstacles(state: GameState, delta: number, random: () => number): void {
  state.obstacleTimer -= delta;

  if (state.obstacleTimer <= 0) {
    state.obstacles.push(createObstacle(random()));
    state.obstacleTimer = 0.72 + random() * 0.9 - Math.min(0.28, state.distance / 9000);
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * delta;
    if (!obstacle.passed && obstacle.x + obstacle.width < state.runner.x) {
      obstacle.passed = true;
      state.bonusScore += 25;
    }
  }

  removeOffscreen(state.obstacles);
}

function updatePickups(state: GameState, delta: number, random: () => number): void {
  state.pickupTimer -= delta;

  if (state.pickupTimer <= 0) {
    state.pickups.push(createPickup(random, state.pickups.length));
    state.pickupTimer = 1.8 + random() * 2.2;
  }

  for (const pickup of state.pickups) {
    pickup.x -= state.speed * delta;
  }

  removeOffscreen(state.pickups);
}

function createObstacle(roll: number): Obstacle {
  const kind: Obstacle["kind"] = roll > 0.7 ? "frank" : roll > 0.34 ? "slurpSlurp" : "goatbox";
  const width = kind === "goatbox" ? 84 : 66;
  const height = kind === "goatbox" ? 108 : kind === "slurpSlurp" ? 52 : 46;
  const y = kind === "frank" ? world.groundY - 142 : world.groundY - height;
  return {
    x: world.width + 24,
    y,
    width,
    height,
    kind,
    passed: false,
  };
}

function createPickup(random: () => number, seed: number): Pickup {
  const phraseIndex =
    Math.floor(random() * canonHooks.pickupPhrases.length + seed) % canonHooks.pickupPhrases.length;
  return {
    x: world.width + 40,
    y: world.groundY - 138 - random() * 74,
    radius: 16,
    collected: false,
    phrase: canonHooks.pickupPhrases[phraseIndex] ?? canonHooks.pickupPhrases[0],
  };
}

function checkCollisions(state: GameState): void {
  const hitbox = runnerHitbox(state.runner);

  for (const obstacle of state.obstacles) {
    if (rectsOverlap(hitbox, obstacle)) {
      endGame(state);
      return;
    }
  }

  for (const pickup of state.pickups) {
    if (!pickup.collected && circleRectOverlap(pickup, hitbox)) {
      pickup.collected = true;
      state.bonusScore += 100;
      state.currentMood = pickup.phrase;
      state.moodTimer = 1.2;
    }
  }
}

function endGame(state: GameState): void {
  state.mode = "gameOver";
  state.best = Math.max(state.best, state.score);
}

function updateMood(state: GameState, delta: number): void {
  state.moodTimer -= delta;
  if (state.moodTimer <= 0) {
    state.currentMood =
      canonHooks.moods[Math.floor(state.distance / 700) % canonHooks.moods.length] ??
      canonHooks.moods[0];
    state.moodTimer = 1;
  }
}

function removeOffscreen(
  items: Array<{ x: number; width?: number; radius?: number; collected?: boolean }>,
): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const padding = item.width ?? item.radius ?? 0;
    if (item.x + padding < -80 || item.collected) {
      items.splice(index, 1);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
