import * as ex from "excalibur";
import {
  type EnvironmentSpriteKey,
  environmentFrames,
  resources,
  type SpriteKey,
  spriteFrames,
  type WalkSpriteKey,
  walkFrames,
  type YudSpriteKey,
} from "./assets";
import { type GameState, type Obstacle, type Pickup, type Runner, world } from "./model";

export function drawWorld(ctx: ex.ExcaliburGraphicsContext, state: GameState): void {
  drawBackground(ctx, state.distance);
  drawTown(ctx, state.distance);
  drawOpenTheCloset(ctx, state.distance);
  drawTrackLayer(ctx, state.distance);
  drawForegroundLane(ctx, state.distance);
  drawPickups(ctx, state.pickups);
  drawObstacles(ctx, state.obstacles, state.obstacleAnimationTime);
  drawRunner(ctx, state.runner, state.runnerAnimationTime);
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

function drawRunner(ctx: ex.ExcaliburGraphicsContext, runner: Runner, animationTime: number): void {
  const cx = runner.x + runner.width / 2;
  const cy = runner.y + runner.height / 2;
  const squash = runner.ducking ? 1.18 : 1;
  const wobble = Math.sin(runner.wobble) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  ctx.scale(squash * runner.facing, 1 / squash);
  drawWalkSprite(ctx, "mommyBall", animationTime, -58, -52, 116, 100);
  ctx.restore();
}

function drawObstacles(
  ctx: ex.ExcaliburGraphicsContext,
  obstacles: Obstacle[],
  animationTime: number,
): void {
  for (const obstacle of obstacles) {
    if (isYudObstacle(obstacle.kind)) {
      drawWalkSprite(
        ctx,
        obstacle.kind,
        animationTime + obstacle.x * 0.01,
        obstacle.x - 16,
        obstacle.y - 17,
        102,
        86,
      );
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

function drawWalkSprite(
  ctx: ex.ExcaliburGraphicsContext,
  sprite: WalkSpriteKey,
  animationTime: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const frames = walkFrames[sprite];
  const frame = frames[Math.floor(animationTime * 8) % frames.length] ?? frames[0];
  ctx.drawImage(
    resources.characterWalk.data,
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
