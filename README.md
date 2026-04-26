# Mommy Ball Runs

A silly browser-based TypeScript side-scroller set in Ballseat Town, an extremely serious literary universe created by children.

Mommy Ball scoots through the Ballseat Town foreground, collects tickets, and dodges canon-accurate trouble from the Yuds, Slurp Slurp, and Frank.

## Run It

Install dependencies, then start the Vite dev server:

```sh
bun install
bun run dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Vite serves the TypeScript entrypoint directly in development and hot-reloads the browser when HTML, CSS, TypeScript, or assets change.

For a production build:

```sh
bun run build
```

## Code Quality

Biome handles formatting and linting, TypeScript handles type checks, and Vitest covers the runner model:

```sh
bun run format
bun run lint
bun run test
bun run typecheck
bun run check
```

## Project Shape

- `index.html` defines the game shell and loads `/src/main.ts`.
- `src/main.ts` boots Excalibur, manages the runner scene, and renders the current Ballseat Town level.
- `src/game/model.ts` contains test-covered runner state, physics, spawning, scoring, and collision rules.
- `src/styles.css` controls the page layout around the game window.
- `assets/generated/ballseat-sprite-sheet.png` contains generated gameplay sprites.
- `assets/generated/yuds.png` contains generated Yud obstacle sprites.
- `assets/generated/ballseat-town-elements.png` contains generated Ballseat Town scenery elements for parallax background layers.
- `references/` contains canon notes and visual references used to create generated assets.

## Generated Assets

The game uses generated raster art for the main visual pieces instead of hand-drawn canvas approximations:

- Mommy Ball, Open the Closet, Slurp Slurp, Frank, and ticket pickups are cropped from `assets/generated/ballseat-sprite-sheet.png`.
- Red, blue, green, and yellow Yuds are cropped from `assets/generated/yuds.png`.
- Houses, trees, shrubs, tracks, signs, and hills are cropped from `assets/generated/ballseat-town-elements.png` and composed as separate parallax layers.
- `assets/generated/ballseat-sprite-sheet-magenta.png` is the original chroma-key source for the sprite sheet.
- `assets/generated/yuds-source.png` is the original chroma-key source for the Yuds sheet.

When adding new Ballseat canon, update `references/canon.md` first. For new visual subjects, generate or edit raster assets from the references, save the final project-bound files under `assets/generated/`, then wire them into `src/main.ts` as sprite frames, background layers, or future level configs.

Small gameplay text such as moods and pickup phrases currently lives in `canonHooks` in `src/game/model.ts`.

## Scripts

- `bun run dev`: start Vite with hot reload.
- `bun run build`: type-check and build production output into ignored `dist/`.
- `bun run preview`: preview the production build.
- `bun run test`: run Vitest unit tests.
- `bun run check`: run TypeScript, Biome checks, and Vitest.
- `bun run ci`: run TypeScript, Biome CI, Vitest, and production build.

## Controls

- Jump: Space, Up, or W
- Move: Arrows, A, or D
- Duck: Down or S
- Pause: P
- Restart: R
