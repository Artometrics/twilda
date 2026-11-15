import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPresetId, PRESET_IDS, PRESETS, type PresetId } from "@twilda/core";
import { checkoutPackages, registryPackages, starterFiles, writeFiles } from "./lib/starter";

/**
 * `npm run create:twilda -- <dir> --mode corporate|magazine|leadgen [--name my-site] [--deps checkout|registry]`
 *
 * Scaffolds a working static Astro site wired to Twilda. Nothing is published to npm, so by default the
 * project links `@twilda/core` and `@twilda/astro` from this checkout with `file:` paths. Once the packages
 * are on npm, `--deps registry` writes version ranges instead.
 */

const NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface CreateOptions {
  dir: string;
  mode: PresetId;
  name?: string;
  deps?: "checkout" | "registry";
}

export function create(options: CreateOptions): { dir: string; files: string[] } {
  const dir = path.resolve(options.dir);
  const name = options.name ?? path.basename(dir).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-._]+/, "");
  if (!NAME.test(name)) throw new Error(`"${name}" is not a usable package name. Use lowercase letters, numbers, dots, and hyphens, or pass --name.`);
  if (!isPresetId(options.mode)) throw new Error(`Unknown mode "${options.mode}". Choose one of: ${PRESET_IDS.join(", ")}.`);
  if (fs.existsSync(dir) && (!fs.statSync(dir).isDirectory() || fs.readdirSync(dir).length > 0)) {
    throw new Error(`${dir} exists and is not an empty folder. Nothing was written.`);
  }
  const files = starterFiles(options.mode, "project", { name, packages: options.deps === "registry" ? registryPackages() : checkoutPackages() });
  writeFiles(dir, files);
  return { dir, files: [...files.keys()] };
}

function usage(): string {
  const modes = PRESET_IDS.map((id) => `  ${id.padEnd(10)} ${PRESETS[id].tagline}`).join("\n");
  return `Usage: npm run create:twilda -- <dir> --mode <mode> [--name <package-name>] [--deps checkout|registry]\n\nModes:\n${modes}\n`;
}

function parse(argv: string[]): CreateOptions {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} needs a value.`);
      flags.set(arg.slice(2), value);
      i += 1;
    } else positional.push(arg);
  }
  for (const key of flags.keys()) if (!["mode", "name", "deps"].includes(key)) throw new Error(`Unknown option --${key}.`);
  const dir = positional[0];
  if (!dir || positional.length > 1) throw new Error("Give exactly one target folder.");
  const mode = flags.get("mode") ?? "";
  if (!isPresetId(mode)) throw new Error(`--mode must be one of: ${PRESET_IDS.join(", ")}.`);
  const deps = flags.get("deps") ?? "checkout";
  if (deps !== "checkout" && deps !== "registry") throw new Error("--deps must be checkout or registry.");
  return { dir, mode, deps, ...(flags.has("name") ? { name: flags.get("name") as string } : {}) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = create(parse(process.argv.slice(2)));
    const rel = path.relative(process.cwd(), result.dir) || ".";
    console.log(`Created a ${PRESETS[parse(process.argv.slice(2)).mode].label} site in ${rel} (${result.files.length} files).\n\nNext:\n  cd ${rel}\n  npm install\n  npm run dev\n`);
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${usage()}`);
    process.exit(1);
  }
}
