import * as ex from "excalibur";
import { loadGameResources } from "./game/assets";
import {
  canonHooks,
  createGameState,
  type GameMode,
  resetGame,
  setPaused,
  world,
} from "./game/model";
import { RunnerScene } from "./game/runner-scene";

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

engine.add(
  "runner",
  new RunnerScene(state, {
    startGame,
    pauseGame,
    resumeGame,
    afterUpdate: () => {
      syncModeSideEffects();
      updateHud();
    },
  }),
);

loadGameResources()
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
