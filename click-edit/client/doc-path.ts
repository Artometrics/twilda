import { documentSchema, type TwildaDocument } from "../../packages/core/src/schema";

/**
 * A `data-twilda-ref` is a dotted path into the document JSON: `sections.0.slides.2.title`.
 * Edits only replace an existing string leaf, then the whole document is validated
 * against the `@twilda/core` schema. Nothing here can add keys or change structure.
 */

const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);

function segments(ref: string): string[] {
  const parts = ref.split(".");
  if (parts.length === 0 || parts.some((part) => part === "" || BLOCKED.has(part))) {
    throw new Error(`Bad field reference "${ref}".`);
  }
  return parts;
}

export function getAtPath(doc: unknown, ref: string): unknown {
  let node: unknown = doc;
  for (const part of segments(ref)) {
    if (node === null || typeof node !== "object" || !Object.hasOwn(node, part)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function setIn(node: unknown, parts: string[], value: string): unknown {
  const [head, ...rest] = parts;
  if (head === undefined) return value;
  if (Array.isArray(node)) {
    const index = Number(head);
    const copy = node.slice();
    copy[index] = setIn(node[index], rest, value);
    return copy;
  }
  const record = node as Record<string, unknown>;
  return { ...record, [head]: setIn(record[head], rest, value) };
}

export type EditResult = { ok: true; doc: TwildaDocument } | { ok: false; error: string };

export function applyEdit(doc: TwildaDocument, ref: string, value: string): EditResult {
  let parts: string[];
  try {
    parts = segments(ref);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (typeof getAtPath(doc, ref) !== "string") {
    return { ok: false, error: `"${ref}" is not an editable text field.` };
  }
  const parsed = documentSchema.safeParse(setIn(doc, parts, value));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.slice(-1).join("") || "field";
    return { ok: false, error: `${where}: ${issue?.message ?? "not valid"}` };
  }
  return { ok: true, doc: parsed.data };
}

/** Single-line fields: collapse whitespace the way the rendered page does. */
export function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Leaf paths whose string value differs between two documents, ignoring status and updatedAt. */
export function changedRefs(before: unknown, after: unknown, prefix = ""): string[] {
  if (typeof before === "string" || typeof after === "string") {
    return before === after ? [] : [prefix];
  }
  if (before === null || after === null || typeof before !== "object" || typeof after !== "object") return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const key of keys) {
    if (prefix === "" && (key === "status" || key === "updatedAt")) continue;
    out.push(
      ...changedRefs(
        (before as Record<string, unknown>)[key],
        (after as Record<string, unknown>)[key],
        prefix ? `${prefix}.${key}` : key,
      ),
    );
  }
  return out;
}

export function fieldLabel(ref: string): string {
  const last = ref.split(".").at(-1) ?? ref;
  const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced === "dek" ? "summary" : spaced;
}
