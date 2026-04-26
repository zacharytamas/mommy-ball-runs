# Mommy Ball Runs

A silly browser-based TypeScript infinite runner set in Ballseat Town, an extremely serious literary universe created by children.

Mommy Ball runs along the train tracks, collects tickets, and dodges canon-accurate trouble from Goatbox, Slurp Slurp, and Frank.

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

Biome handles formatting and linting, and TypeScript handles type checks:

```sh
bun run format
bun run lint
bun run typecheck
bun run check
```

## Project Shape

- `index.html` defines the game shell and loads `/src/main.ts`.
- `src/main.ts` contains the canvas game loop, physics, spawning, collision checks, and sprite rendering.
- `src/styles.css` controls the page layout around the game window.
- `assets/generated/ballseat-sprite-sheet.png` contains generated gameplay sprites.
- `assets/generated/ballseat-town-background.png` contains the generated Ballseat Town backdrop.
- `references/` contains canon notes and visual references used to create generated assets.

## Generated Assets

The game uses generated raster art for the main visual pieces instead of hand-drawn canvas approximations:

- Mommy Ball, Open the Closet, Goatbox, Slurp Slurp, Frank, and ticket pickups are cropped from `assets/generated/ballseat-sprite-sheet.png`.
- The background is `assets/generated/ballseat-town-background.png`.
- `assets/generated/ballseat-sprite-sheet-magenta.png` is the original chroma-key source for the sprite sheet.

When adding new Ballseat canon, update `references/canon.md` first. For new visual subjects, generate or edit raster assets from the references, save the final project-bound files under `assets/generated/`, then wire them into `src/main.ts` as sprite frames or background layers.

Small gameplay text such as moods and pickup phrases still lives in `canonHooks` in `src/main.ts`.

## Scripts

- `bun run dev`: start Vite with hot reload.
- `bun run build`: type-check and build production output into ignored `dist/`.
- `bun run preview`: preview the production build.
- `bun run check`: run TypeScript and Biome checks.
- `bun run ci`: run TypeScript, Biome CI, and production build.

## Controls

- Jump: Space, Up, or W
- Duck: Down or S
- Pause: P
- Restart: R
