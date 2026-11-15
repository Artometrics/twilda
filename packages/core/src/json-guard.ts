import { TwildaError } from "./errors";

export interface JsonBounds {
  maxDepth: number;
  maxNodes: number;
  maxArrayLength: number;
  maxObjectKeys: number;
}

/**
 * Real documents are a few hundred nodes. These bounds sit far above any legitimate file
 * and far below what it takes to exhaust memory inside a schema validator, so a hostile
 * `draft.json` is refused by a cheap iterative walk before zod ever sees it.
 */
export const DEFAULT_JSON_BOUNDS: JsonBounds = {
  maxDepth: 24,
  maxNodes: 50_000,
  maxArrayLength: 2_000,
  maxObjectKeys: 500,
};

/**
 * Throw `too-large` when parsed JSON is deeper, wider, or has more nodes than any real
 * Twilda file. Iterative on purpose: a deeply nested hostile file must not overflow the stack here.
 */
export function assertJsonBounds(value: unknown, bounds: JsonBounds = DEFAULT_JSON_BOUNDS): void {
  const stack: Array<{ item: unknown; depth: number }> = [{ item: value, depth: 1 }];
  let nodes = 0;
  while (stack.length > 0) {
    const entry = stack.pop() as { item: unknown; depth: number };
    const { item: node, depth } = entry;
    nodes += 1;
    if (nodes > bounds.maxNodes) throw new TwildaError("Document is too large to read.", "too-large");
    if (typeof node !== "object" || node === null) continue;
    if (depth > bounds.maxDepth) throw new TwildaError("Document is nested too deeply to read.", "too-large");
    if (Array.isArray(node)) {
      if (node.length > bounds.maxArrayLength) throw new TwildaError("Document has a list that is too long to read.", "too-large");
      for (const child of node) stack.push({ item: child, depth: depth + 1 });
      continue;
    }
    const keys = Object.keys(node);
    if (keys.length > bounds.maxObjectKeys) throw new TwildaError("Document has an object with too many fields to read.", "too-large");
    for (const key of keys) stack.push({ item: (node as Record<string, unknown>)[key], depth: depth + 1 });
  }
}
