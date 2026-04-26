# Mommy Ball Runs

A silly browser-based TypeScript infinite runner, ready for whatever extremely serious literary canon arrives next.

## Run It

This first scaffold avoids package installation because the local environment has Node but no `npm`.

```sh
node scripts/build.mjs
node scripts/dev-server.mjs
```

Then open [http://localhost:5173](http://localhost:5173).

The included dev server binds to `127.0.0.1` by default. Set `PORT` or `HOST` if you need a different local address.

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
