import * as ex from "excalibur";
import { type GameState, updateGame } from "./model";
import { drawWorld } from "./rendering";

interface RunnerSceneActions {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  afterUpdate: () => void;
}

export class RunnerScene extends ex.Scene {
  constructor(
    private readonly gameState: GameState,
    private readonly actions: RunnerSceneActions,
  ) {
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
      this.actions.startGame();
    } else if (
      this.gameState.mode === "gameOver" &&
      (jumpPressed || keyboard.wasPressed(ex.Keys.R))
    ) {
      this.actions.startGame();
    } else if (keyboard.wasPressed(ex.Keys.P) && this.gameState.mode === "running") {
      this.actions.pauseGame();
    } else if (keyboard.wasPressed(ex.Keys.P) && this.gameState.mode === "paused") {
      this.actions.resumeGame();
    } else if (keyboard.wasPressed(ex.Keys.R)) {
      this.actions.startGame();
    }

    updateGame(this.gameState, Math.min(elapsed / 1000, 0.033), {
      horizontal,
      jumpPressed,
      ducking,
    });
    this.actions.afterUpdate();
  }

  override onPostDraw(ctx: ex.ExcaliburGraphicsContext): void {
    drawWorld(ctx, this.gameState);
  }
}
