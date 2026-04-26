import * as ex from "excalibur";
import {
  canonHooks,
  createGameState,
  type GameMode,
  type GameState,
  type Obstacle,
  type Pickup,
  type Runner,
  resetGame,
  setPaused,
  updateGame,
  world,
} from "./game/model";

type SpriteKey = "mommyBall" | "slurpSlurp" | "frank" | "openTheCloset" | "ticket";
type YudSpriteKey = "yudRed" | "yudBlue" | "yudGreen" | "yudYellow";
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

const resources = {
  sprites: new ex.ImageSource("/assets/generated/ballseat-sprite-sheet.png"),
  town: new ex.ImageSource("/assets/generated/ballseat-town-elements.png"),
  yuds: new ex.ImageSource("/assets/generated/yuds.png"),
};

const spriteFrames: Record<SpriteKey, SpriteFrame> = {
  mommyBall: { x: 70, y: 122, width: 385, height: 332 },
  slurpSlurp: { x: 1085, y: 199, width: 334, height: 269 },
  frank: { x: 53, y: 606, width: 423, height: 294 },
  openTheCloset: { x: 552, y: 600, width: 438, height: 320 },
  ticket: { x: 1075, y: 617, width: 421, height: 313 },
};

const yudFrames: Record<YudSpriteKey, SpriteFrame> = {
  yudRed: { x: 64, y: 94, width: 522, height: 428 },
  yudBlue: { x: 683, y: 110, width: 498, height: 424 },
  yudGreen: { x: 101, y: 668, width: 461, height: 430 },
  yudYellow: { x: 681, y: 692, width: 444, height: 421 },
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
  treeSmall: { x: 900, y: 731, width: 132, height: 163 },
};

const state = createGameState(Number(localStorage.getItem("mommy-ball-best") ?? 0));
let previousMode: GameMode = state.mode;

bestElement.textContent = String(state.best);
updateHud();

const engine = new ex.Engine({
  canvasElement: canvas,
  width: world.width,
  height: world.height,
  displayMode: ex.DisplayMode.Fixed,
  antialiasing: true,
  suppressConsoleBootMessage: true,
  suppressPlayButton: true,
});

startButton.addEventListener("click", () => {
  if (state.mode === "running") return;
  if (state.mode === "paused") {
    resumeGame();
    return;
  }

  startGame();
});

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
});

class RunnerScene extends ex.Scene {
  constructor(private readonly gameState: GameState) {
    super();
  }

  override onPreUpdate(engine: ex.Engine, elapsed: number): void {
    const keyboard = engine.input.keyboard;
    const jumpPressed =
      keyboard.wasPressed(ex.Keys.Space) ||
      keyboard.wasPressed(ex.Keys.Up) ||
      keyboard.wasPressed(ex.Keys.W);
    const ducking = keyboard.isHeld(ex.Keys.Down) || keyboard.isHeld(ex.Keys.S);
    const left = keyboard.isHeld(ex.Keys.Left) || keyboard.isHeld(ex.Keys.A);
    const right = keyboard.isHeld(ex.Keys.Right) || keyboard.isHeld(ex.Keys.D);
    const horizontal = right && !left ? 1 : left && !right ? -1 : 0;

    if (this.gameState.mode === "ready" && (jumpPressed || horizontal !== 0)) {
      startGame();
    } else if (
      this.gameState.mode === "gameOver" &&
      (jumpPressed || keyboard.wasPressed(ex.Keys.R))
    ) {
      startGame();
    } else if (keyboard.wasPressed(ex.Keys.P) && this.gameState.mode === "running") {
      pauseGame();
    } else if (keyboard.wasPressed(ex.Keys.P) && this.gameState.mode === "paused") {
      resumeGame();
    } else if (keyboard.wasPressed(ex.Keys.R)) {
      startGame();
    }

    updateGame(this.gameState, Math.min(elapsed / 1000, 0.033), {
      horizontal,
      jumpPressed,
      ducking,
    });
    syncModeSideEffects();
    updateHud();
  }

  override onPostDraw(ctx: ex.ExcaliburGraphicsContext): void {
    drawBackground(ctx, this.gameState.distance);
    drawTown(ctx, this.gameState.distance);
    drawOpenTheCloset(ctx, this.gameState.distance);
    drawTrackLayer(ctx, this.gameState.distance);
    drawForegroundLane(ctx, this.gameState.distance);
    drawPickups(ctx, this.gameState.pickups);
    drawObstacles(ctx, this.gameState.obstacles);
    drawRunner(ctx, this.gameState.runner);
  }
}

engine.add("runner", new RunnerScene(state));

Promise.all([resources.sprites.load(), resources.town.load(), resources.yuds.load()])
  .then(() => engine.start("runner"))
  .then(() => {
    updateHud();
  });

function startGame(): void {
  resetGame(state);
  overlay.hidden = true;
  previousMode = state.mode;
  updateHud();
}

function pauseGame(): void {
  setPaused(state, true);
  overlay.hidden = false;
  overlayCopy.textContent = "Paused for dramatic canon consultation.";
  startButton.textContent = "Resume";
  updateHud();
}

function resumeGame(): void {
  setPaused(state, false);
  overlay.hidden = true;
  updateHud();
}

function syncModeSideEffects(): void {
  if (previousMode === state.mode) return;

  if (state.mode === "gameOver") {
    localStorage.setItem("mommy-ball-best", String(state.best));
    overlay.hidden = false;
    overlayCopy.textContent = `${canonHooks.runnerName} bonked somewhere between Ballseat Town and Ballseat Island at ${state.score} points.`;
    startButton.textContent = "Run Again";
  }

  previousMode = state.mode;
}

function updateHud(): void {
  scoreElement.textContent = String(state.score);
  bestElement.textContent = String(state.best);
  moodElement.textContent =
    state.mode === "paused" ? "Paused" : state.mode === "gameOver" ? "Bonked" : state.currentMood;
}

function drawBackground(ctx: ex.ExcaliburGraphicsContext, distance: number): void {
  ctx.drawRectangle(ex.vec(0, 0), world.width, world.height, ex.Color.fromHex("#a9ddf0"));
  ctx.drawRectangle(ex.vec(0, 188), world.width, 180, ex.Color.fromHex("#dff4ef"));
  ctx.drawRectangle(ex.vec(0, 335), world.width, world.height - 335, ex.Color.fromHex("#cbeec7"));

  drawRepeatingEnvironment(ctx, "cloudHills", distance, 238, 355, 124, 0.2, 470, 70);
}

function drawTown(ctx: ex.ExcaliburGraphicsContext, distance: number): void {
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
      drawEnvironmentSprite(ctx, sprite, x + offsetX, y, width, height);
    }
  }
}

function drawOpenTheCloset(ctx: ex.ExcaliburGraphicsContext, distance: number): void {
  const x = world.width - ((distance * 0.55) % (world.width + 680));
  drawSprite(ctx, "openTheCloset", x - 8, world.trainY - 78, 210, 154);
}

function drawTrackLayer(ctx: ex.ExcaliburGraphicsContext, distance: number): void {
  drawRepeatingEnvironment(ctx, "rail", distance, 354, 500, 73, 0.72, 0, 0);
  drawRepeatingEnvironment(ctx, "fence", distance, 385, 300, 81, 0.66, 155, 120);
}

function drawForegroundLane(ctx: ex.ExcaliburGraphicsContext, distance: number): void {
  ctx.drawRectangle(ex.vec(0, 426), world.width, world.height - 426, ex.Color.fromHex("#bfe7c0"));

  const dashWidth = 32;
  const dashGap = 28;
  const dashPattern = dashWidth + dashGap;
  const dashStart = -((distance * 0.98) % dashPattern);
  for (let x = dashStart; x < world.width; x += dashPattern) {
    ctx.drawRectangle(ex.vec(x, 497), dashWidth, 7, ex.Color.fromRGB(113, 153, 128, 0.34));
  }

  drawRepeatingEnvironment(ctx, "shrubLarge", distance, 414, 130, 61, 0.9, 360, 20);
  drawRepeatingEnvironment(ctx, "shrubFlowers", distance, 421, 164, 54, 0.92, 440, 260);
  drawRepeatingEnvironment(ctx, "treeSmall", distance, 368, 70, 86, 0.88, 620, 470);
}

function drawRunner(ctx: ex.ExcaliburGraphicsContext, runner: Runner): void {
  const cx = runner.x + runner.width / 2;
  const cy = runner.y + runner.height / 2;
  const squash = runner.ducking ? 1.18 : 1;
  const wobble = Math.sin(runner.wobble) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  ctx.scale(squash, 1 / squash);
  drawSprite(ctx, "mommyBall", -58, -52, 116, 100);
  ctx.restore();
}

function drawObstacles(ctx: ex.ExcaliburGraphicsContext, obstacles: Obstacle[]): void {
  for (const obstacle of obstacles) {
    if (isYudObstacle(obstacle.kind)) {
      drawYud(ctx, obstacle.kind, obstacle.x - 16, obstacle.y - 17, 102, 86);
    } else if (obstacle.kind === "slurpSlurp") {
      drawSprite(ctx, "slurpSlurp", obstacle.x - 12, obstacle.y - 10, 90, 72);
    } else {
      drawSprite(ctx, "frank", obstacle.x - 10, obstacle.y - 10, 86, 60);
    }
  }
}

function isYudObstacle(kind: Obstacle["kind"]): kind is YudSpriteKey {
  return kind === "yudRed" || kind === "yudBlue" || kind === "yudGreen" || kind === "yudYellow";
}

function drawPickups(ctx: ex.ExcaliburGraphicsContext, pickups: Pickup[]): void {
  for (const pickup of pickups) {
    drawSprite(ctx, "ticket", pickup.x - 28, pickup.y - 20, 56, 40);
  }
}

function drawSprite(
  ctx: ex.ExcaliburGraphicsContext,
  sprite: SpriteKey,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const frame = spriteFrames[sprite];
  ctx.drawImage(
    resources.sprites.data,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    x,
    y,
    width,
    height,
  );
}

function drawYud(
  ctx: ex.ExcaliburGraphicsContext,
  sprite: YudSpriteKey,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const frame = yudFrames[sprite];
  ctx.drawImage(
    resources.yuds.data,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    x,
    y,
    width,
    height,
  );
}

function drawEnvironmentSprite(
  ctx: ex.ExcaliburGraphicsContext,
  sprite: EnvironmentSpriteKey,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const frame = environmentFrames[sprite];
  ctx.drawImage(
    resources.town.data,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    x,
    y,
    width,
    height,
  );
}

function drawRepeatingEnvironment(
  ctx: ex.ExcaliburGraphicsContext,
  sprite: EnvironmentSpriteKey,
  distance: number,
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
    drawEnvironmentSprite(ctx, sprite, x, y, width, height);
  }
}
