import { createBlock, createId, createSection } from "./library";
import { BLOCK_TYPES, PAGE_SECTION_TYPES, type BlockType, type PageSectionType, type TwildaDocument } from "./schema";

/**
 * Add, remove, move, and duplicate whole sections (pages) or blocks (articles).
 * Pure functions over a document: each returns a new document or says why not.
 * They enforce the schema's count limits and keep ids unique, and they can only
 * produce parts from the prepared library. Nothing positions anything freely.
 */

export const MAX_SECTIONS = 20;
export const MAX_BLOCKS = 80;

export type StructureResult = { ok: true; doc: TwildaDocument; index: number } | { ok: false; error: string };

type Listed = { key: "sections" | "blocks"; items: Array<{ id: string }> };

function listOf(doc: TwildaDocument): Listed {
  return doc.kind === "page"
    ? { key: "sections", items: doc.sections }
    : { key: "blocks", items: doc.blocks };
}

function withList(doc: TwildaDocument, items: unknown[]): TwildaDocument {
  return (doc.kind === "page" ? { ...doc, sections: items } : { ...doc, blocks: items }) as TwildaDocument;
}

/** `sections.2` or `blocks.0` to an index in this document's list. */
export function parseNodePath(doc: TwildaDocument, path: string): number | null {
  const { key, items } = listOf(doc);
  const match = new RegExp(`^${key}\\.(\\d+)$`).exec(path);
  if (!match) return null;
  const index = Number(match[1]);
  return index < items.length ? index : null;
}

export function listLabel(doc: TwildaDocument): { noun: string; plural: string } {
  return doc.kind === "page" ? { noun: "section", plural: "sections" } : { noun: "block", plural: "blocks" };
}

export function moveNode(doc: TwildaDocument, index: number, to: number): StructureResult {
  const { items } = listOf(doc);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, error: "That part is not on the page." };
  if (!Number.isInteger(to) || to < 0 || to >= items.length) return { ok: false, error: "It cannot move further that way." };
  if (to === index) return { ok: true, doc, index };
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item as { id: string });
  return { ok: true, doc: withList(doc, next), index: to };
}

export function removeNode(doc: TwildaDocument, index: number): StructureResult {
  const { items } = listOf(doc);
  const { noun } = listLabel(doc);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, error: "That part is not on the page." };
  if (items.length <= 1) return { ok: false, error: `A ${doc.kind} needs at least one ${noun}.` };
  return { ok: true, doc: withList(doc, items.filter((_, i) => i !== index)), index: Math.min(index, items.length - 2) };
}

/** Insert a prepared part at `at` (0 to length). The type must be one the library offers for this kind of document. */
export function addNode(doc: TwildaDocument, type: string, at: number): StructureResult {
  const { items } = listOf(doc);
  const { noun, plural } = listLabel(doc);
  const max = doc.kind === "page" ? MAX_SECTIONS : MAX_BLOCKS;
  if (items.length >= max) return { ok: false, error: `A ${doc.kind} holds at most ${max} ${plural}.` };
  const index = Math.max(0, Math.min(items.length, Math.trunc(at)));
  let node: { id: string };
  try {
    node = doc.kind === "page" ? createSection(type as PageSectionType) : createBlock(type as BlockType);
  } catch {
    return { ok: false, error: `"${type}" is not a prepared ${noun}.` };
  }
  const next = items.slice();
  next.splice(index, 0, node);
  return { ok: true, doc: withList(doc, next), index };
}

function freshIds(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.map((item) => freshIds(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = key === "id" && typeof entry === "string" ? createId(entry.replace(/-[0-9a-f]{8}$/, "").slice(0, 60) || "copy") : freshIds(entry, depth + 1);
    }
    return out;
  }
  return value;
}

export function duplicateNode(doc: TwildaDocument, index: number): StructureResult {
  const { items } = listOf(doc);
  const { plural } = listLabel(doc);
  const max = doc.kind === "page" ? MAX_SECTIONS : MAX_BLOCKS;
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, error: "That part is not on the page." };
  if (items.length >= max) return { ok: false, error: `A ${doc.kind} holds at most ${max} ${plural}.` };
  const copy = freshIds(items[index]) as { id: string };
  const next = items.slice();
  next.splice(index + 1, 0, copy);
  return { ok: true, doc: withList(doc, next), index: index + 1 };
}

/** The prepared parts the library offers for a document. */
export function libraryFor(doc: TwildaDocument): readonly string[] {
  return doc.kind === "page" ? PAGE_SECTION_TYPES : BLOCK_TYPES;
}
