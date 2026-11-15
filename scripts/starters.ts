import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isPresetId, PRESET_IDS } from "@twilda/core";
import { exampleFiles, starterDir, writeFiles } from "./lib/starter";

/**
 * `tsx scripts/starters.ts sync | dev <mode> | build <mode> | build-all`
 *
 * `sync` rewrites `examples/starter-<mode>/` from the presets. A test fails when the folders differ
 * from the generator, so run `npm run starters:sync` after changing a preset.
 */

const [command, mode] = process.argv.slice(2);

function pick(): (typeof PRESET_IDS)[number] {
  if (!mode || !isPresetId(mode)) {
    console.error(`Name a mode: ${PRESET_IDS.join(", ")}.`);
    process.exit(1);
  }
  return mode;
}

function astro(id: (typeof PRESET_IDS)[number], args: string[]): number {
  const result = spawnSync(path.resolve("node_modules", ".bin", "astro"), [...args, "--root", starterDir(id)], {
    stdio: "inherit",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  return result.status ?? 1;
}

if (command === "sync") {
  for (const id of PRESET_IDS) {
    const dir = starterDir(id);
    fs.rmSync(path.join(dir, "content"), { recursive: true, force: true });
    fs.rmSync(path.join(dir, "public"), { recursive: true, force: true });
    writeFiles(dir, exampleFiles(id), { overwrite: true });
    console.log(`wrote ${path.relative(process.cwd(), dir)}`);
  }
} else if (command === "dev") {
  process.exit(astro(pick(), ["dev", "--host", "127.0.0.1", "--port", "4321"]));
} else if (command === "build") {
  process.exit(astro(pick(), ["build"]));
} else if (command === "build-all") {
  for (const id of PRESET_IDS) {
    const status = astro(id, ["build"]);
    if (status !== 0) process.exit(status);
  }
} else {
  console.error("Usage: tsx scripts/starters.ts sync | dev <mode> | build <mode> | build-all");
  process.exit(1);
}
