# Mommy Ball Runs

A silly browser-based TypeScript infinite runner, ready for whatever extremely serious literary canon arrives next.

## Run It

Install dependencies, then start Vite:

```sh
bun install
bun run dev
```

Then open [http://localhost:5173](http://localhost:5173).

Vite serves the TypeScript entrypoint directly in development and hot-reloads the browser when HTML, CSS, TypeScript, or assets change.

## Code Quality

Biome handles formatting and linting:

```sh
biome format --write .
biome lint .
```

Once dependencies are installed, the same checks are available through the package scripts:

```sh
bun run format
bun run lint
bun run check
```

## Controls

- Jump: Space, Up, or W
- Duck: Down or S
- Pause: P
- Restart: R

## Where The Canon Goes

Start with `canonHooks` in `src/main.ts`. It currently controls the runner name, moods, and pickup phrases. Once the canon details land, good next additions are:

- Named obstacle types with custom art and behavior
- Multiple runners with different jump arcs
- Chapter-style biomes
- Collectible lore snippets between runs

The current build pulls visual direction from `references/`. Game sprites live in `assets/generated/ballseat-sprite-sheet.png`, generated with the `imagegen` skill from the reference art, then used by the canvas renderer for Mommy Ball, Open the Closet, Goatbox, Slurp Slurp, Frank, and ticket pickups.
