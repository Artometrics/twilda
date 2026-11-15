import { documentSchema, type TwildaDocument } from "../schema";

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

export interface ApplyEditOptions {
  /**
   * A draft in progress may hold other fields the schema would refuse (an empty
   * paragraph on a new block, a placeholder link). Lenient mode refuses an edit
   * only when the schema objects to the field being edited, and keeps the rest as it is.
   */
  lenient?: boolean;
}

function issueMessage(issue: { path: ReadonlyArray<PropertyKey>; message: string } | undefined): string {
  const where = issue?.path.slice(-1).map(String).join("") || "field";
  return `${where}: ${issue?.message ?? "not valid"}`;
}

export function applyEdit(doc: TwildaDocument, ref: string, value: string, options: ApplyEditOptions = {}): EditResult {
  let parts: string[];
  try {
    parts = segments(ref);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (typeof getAtPath(doc, ref) !== "string") {
    return { ok: false, error: `"${ref}" is not an editable text field.` };
  }
  const next = setIn(doc, parts, value);
  const parsed = documentSchema.safeParse(next);
  if (parsed.success) return { ok: true, doc: parsed.data };
  if (!options.lenient) return { ok: false, error: issueMessage(parsed.error.issues[0]) };
  const own = parsed.error.issues.find(
    (issue) => issue.path.length >= parts.length && parts.every((part, i) => String(issue.path[i]) === part),
  );
  if (own) return { ok: false, error: issueMessage(own) };
  return { ok: true, doc: next as TwildaDocument };
}

/** Single-line fields: collapse whitespace the way the rendered page does. */
export function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Paragraph fields: keep line breaks, one blank line between paragraphs, no trailing space. */
export function normalizeMultiline(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    if (BLOCKED.has(key)) continue;
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
  const parts = ref.split(".");
  let last = parts.at(-1) ?? ref;
  if (/^\d+$/.test(last) && parts.length > 1) last = (parts.at(-2) ?? "item").replace(/s$/, "");
  const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (spaced === "dek") return "summary";
  if (spaced === "src") return "image";
  return spaced;
}
