import { describe, expect, it } from "vitest";
import {
  circleRectOverlap,
  createGameState,
  type GameState,
  obstacleHitbox,
  rectsOverlap,
  resetGame,
  updateGame,
  world,
} from "./model";

describe("runner model", () => {
  it("starts Mommy Ball on the foreground lane and jumps from the ground", () => {
    const state = runningState();

    updateGame(state, 0.016, { horizontal: 0, jumpPressed: true, ducking: false }, () => 0.5);

    expect(state.runner.grounded).toBe(false);
    expect(state.runner.vy).toBeGreaterThan(world.jumpVelocity);
    expect(state.runner.y).toBeLessThan(world.groundY - state.runner.height);
  });

  it("advances the course when moving right and eases backward within a limit", () => {
    const state = runningState();

    updateGame(state, 1, { horizontal: 1, jumpPressed: false, ducking: false }, () => 0.5);
    const forwardDistance = state.distance;

    updateGame(state, 1, { horizontal: -1, jumpPressed: false, ducking: false }, () => 0.5);

    expect(forwardDistance).toBeGreaterThan(0);
    expect(state.furthestDistance).toBe(forwardDistance);
    expect(state.distance).toBeGreaterThanOrEqual(forwardDistance - world.backtrackLimit);
  });

  it("does not advance the course without movement input", () => {
    const state = runningState();

    updateGame(state, 1, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.distance).toBe(0);
    expect(state.score).toBe(0);
  });

  it("advances walk animation while moving", () => {
    const state = runningState();

    updateGame(state, 0.5, { horizontal: 1, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.runnerAnimationTime).toBe(0.5);
    expect(state.obstacleAnimationTime).toBe(0.5);
  });

  it("keeps obstacle animations running while Mommy Ball is idle", () => {
    const state = runningState();

    updateGame(state, 0.5, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.runnerAnimationTime).toBe(0);
    expect(state.obstacleAnimationTime).toBe(0.5);
  });

  it("moves Mommy Ball around the play window without leaving it", () => {
    const state = runningState();

    updateGame(state, 5, { horizontal: -1, jumpPressed: false, ducking: false }, () => 0.5);
    expect(state.runner.x).toBe(world.runnerMinX);

    updateGame(state, 5, { horizontal: 1, jumpPressed: false, ducking: false }, () => 0.5);
    expect(state.runner.x).toBe(world.runnerMaxX);
  });

  it("keeps most of the window ahead of Mommy Ball at the forward edge", () => {
    expect(world.width - (world.runnerMaxX + 76)).toBeGreaterThanOrEqual(560);
  });

  it("only awards obstacle pass points once", () => {
    const state = runningState();
    state.obstacles.push({
      x: state.runner.x - 90,
      y: world.groundY - 52,
      width: 66,
      height: 52,
      kind: "slurpSlurp",
      passed: false,
    });

    updateGame(state, 0.016, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);
    updateGame(state, 0.016, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.bonusScore).toBe(25);
    expect(state.obstacles[0]?.passed).toBe(true);
  });

  it("spawns Yuds where Goatbox used to appear", () => {
    const state = runningState();
    state.obstacleTimer = 0;

    updateGame(state, 0.016, { horizontal: 1, jumpPressed: false, ducking: false }, () => 0.05);

    expect(state.obstacles[0]?.kind).toBe("yudRed");
    expect(state.obstacles[0]?.height).toBe(66);
  });

  it("collects a pickup and promotes its phrase into the mood", () => {
    const state = runningState();
    state.pickups.push({
      x: state.runner.x + 38,
      y: state.runner.y + 28,
      radius: 16,
      collected: false,
      phrase: "magic wand charge",
    });

    updateGame(state, 0.016, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.bonusScore).toBe(100);
    expect(state.currentMood).toBe("magic wand charge");
    expect(state.pickups).toHaveLength(0);
  });

  it("ends the run when an obstacle overlaps the runner hitbox", () => {
    const state = runningState();
    state.score = 400;
    state.obstacles.push({
      x: state.runner.x + 12,
      y: state.runner.y + 10,
      width: 48,
      height: 48,
      kind: "frank",
      passed: false,
    });

    updateGame(state, 0.016, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.mode).toBe("gameOver");
    expect(state.best).toBeGreaterThanOrEqual(state.score);
  });

  it("forgives transparent sprite padding around obstacles", () => {
    const yud = obstacleHitbox({
      x: 300,
      y: world.groundY - 66,
      width: 70,
      height: 66,
      kind: "yudRed",
      passed: false,
    });
    const frank = obstacleHitbox({
      x: 300,
      y: world.groundY - 142,
      width: 66,
      height: 46,
      kind: "frank",
      passed: false,
    });

    expect(yud.x).toBe(320);
    expect(yud.y).toBe(world.groundY - 42);
    expect(yud.width).toBe(30);
    expect(yud.height).toBe(28);
    expect(frank.x).toBe(314);
    expect(frank.width).toBe(38);
    expect(frank.height).toBe(26);
  });

  it("forgives Mommy Ball clearing the top edge of a Yud during a jump", () => {
    const yud = obstacleHitbox({
      x: 220,
      y: world.groundY - 66,
      width: 70,
      height: 66,
      kind: "yudRed",
      passed: false,
    });

    expect(rectsOverlap({ x: 224, y: yud.y - 60, width: 52, height: 58 }, yud)).toBe(false);
  });

  it("does not end the run for a near miss inside obstacle sprite padding", () => {
    const state = runningState();
    state.score = 400;
    state.obstacles.push({
      x: state.runner.x + 58,
      y: state.runner.y + 10,
      width: 66,
      height: 52,
      kind: "slurpSlurp",
      passed: false,
    });

    updateGame(state, 0.016, { horizontal: 0, jumpPressed: false, ducking: false }, () => 0.5);

    expect(state.mode).toBe("running");
  });
});

describe("collision helpers", () => {
  it("detects rectangle overlap edges conservatively", () => {
    expect(
      rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 4, height: 4 }),
    ).toBe(true);
    expect(
      rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10, width: 4, height: 4 }),
    ).toBe(false);
  });

  it("detects pickup circles against runner rectangles", () => {
    expect(circleRectOverlap({ x: 5, y: 5, radius: 4 }, { x: 8, y: 2, width: 8, height: 8 })).toBe(
      true,
    );
    expect(circleRectOverlap({ x: 0, y: 0, radius: 2 }, { x: 8, y: 8, width: 8, height: 8 })).toBe(
      false,
    );
  });
});

function runningState(): GameState {
  const state = createGameState(0);
  resetGame(state);
  return state;
}
