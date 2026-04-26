import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, "src", "main.ts");
const outputPath = join(root, "dist", "main.js");
const source = await readFile(sourcePath, "utf8");

const stripped = source
  .replace(/^interface\s+\w+\s+\{[\s\S]*?^}\n/gm, "")
  .replace(/^type\s+\w+\s*=\s*[^;]+;\n/gm, "")
  .replace(/document\.querySelector<[^>]+>/g, "document.querySelector")
  .replace(/new Set<[^>]+>\(/g, "new Set(")
  .replace(
    /addEventListener\("keydown", \(event: KeyboardEvent\)/g,
    'addEventListener("keydown", (event)',
  )
  .replace(
    /addEventListener\("keyup", \(event: KeyboardEvent\)/g,
    'addEventListener("keyup", (event)',
  )
  .replace(/const (\w+): ([^=]+) =/g, "const $1 =")
  .replace(/let (\w+): ([^=]+) =/g, "let $1 =")
  .replace(/function (\w+)\(([^)]*)\): [^{]+ \{/g, (_match, name, params) => {
    const cleanParams = params
      .split(",")
      .map((param) => param.replace(/: [^,=]+/g, ""))
      .join(",");
    return `function ${name}(${cleanParams}) {`;
  })
  .replace(/\): boolean =>/g, ") =>")
  .replace(/\): void =>/g, ") =>")
  .replace(/: Obstacle\["kind"\]/g, "")
  .replace(/: Runner|: Obstacle|: Pickup|: Cloud|: GameMode/g, "")
  .replace(/: Array<\{[^;]+?}>/g, "")
  .replace(/: \{ x: number; y: number; width: number; height: number }/g, "")
  .replace(/: number/g, "")
  .replace(/: string/g, "")
  .replace(/: boolean/g, "");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${stripped.trim()}\n`);

if (!process.argv.includes("--check")) {
  console.log(`Built ${outputPath}`);
}
