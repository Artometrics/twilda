import type { SiteSettings } from "./site";
import { BLOCK_LABELS, SECTION_LABELS, type BlockType, type PageSectionType, type TwildaDocument } from "./schema";

/**
 * Three-way merge of two edits to the same document.
 *
 * `base` is the copy both people started from, `ours` is the draft on this device,
 * `theirs` is what is on `main` now. Fields only one side changed merge cleanly.
 * Lists of blocks, sections, slides, stories, items, and sources are matched by `id`, so
 * adding a block on one side and rewording another on the other side both survive.
 * A field both sides changed to different values is a conflict, and a person picks.
 *
 * With no `base` (this device never saw the file on `main`), every difference is a
 * conflict, because there is nothing to say who changed what.
 */

export type MergeChoice = "ours" | "theirs";

export interface MergeConflict {
  /** Stable key for this conflict: ids, not positions, e.g. `blocks[p1].text`. */
  key: string;
  /** Where it is, in words: "Paragraph: text". */
  label: string;
  base: unknown;
  ours: unknown;
  theirs: unknown;
}

export interface MergeResult {
  doc: TwildaDocument;
  conflicts: MergeConflict[];
  /** True when `main`'s copy differs from `base`, so there was something to fold in. */
  theirsChanged: boolean;
}

type Json = unknown;
interface Ctx {
  conflicts: MergeConflict[];
  decisions: Record<string, MergeChoice>;
  ours: Json;
  theirs: Json;
}

function stable(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, Json>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

const same = (a: Json, b: Json) => stable(a) === stable(b);
const isRecord = (value: Json): value is Record<string, Json> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasIds = (value: Json): value is Array<{ id: string }> =>
  Array.isArray(value) &&
  value.every((item) => isRecord(item) && typeof item.id === "string") &&
  new Set(value.map((item) => (item as { id: string }).id)).size === value.length;

function describe(key: string, ours: Json, theirs: Json): string {
  const match = /^(blocks|sections)\[([^\]]+)\]\.(.+)$/.exec(key);
  const field = key.replace(/\[[^\]]+\]/g, "").split(".").at(-1) ?? key;
  if (!match) return field;
  const [, list, id] = match;
  for (const doc of [ours, theirs]) {
    const items = isRecord(doc) ? (doc[list as string] as Array<{ id: string; type: string }> | undefined) : undefined;
    const found = items?.find((item) => item.id === id);
    if (found) {
      const label = list === "blocks" ? BLOCK_LABELS[found.type as BlockType] : SECTION_LABELS[found.type as PageSectionType];
      return `${label ?? found.type}: ${field}`;
    }
  }
  return field;
}

function conflict(ctx: Ctx, key: string, base: Json, ours: Json, theirs: Json): Json {
  ctx.conflicts.push({ key, label: describe(key, ctx.ours, ctx.theirs), base, ours, theirs });
  return ctx.decisions[key] === "theirs" ? theirs : ours;
}

function mergeOrder(ctx: Ctx, key: string, base: string[], ours: string[], theirs: string[], hasBase: boolean): string[] {
  const inBoth = new Set(ours.filter((id) => theirs.includes(id)));
  const keep = (list: string[]) => list.filter((id) => inBoth.has(id));
  const o = keep(ours);
  const t = keep(theirs);
  const b = keep(base);
  let source: string[] = ours;
  if (!same(o, t)) {
    if (hasBase && same(o, b)) source = theirs;
    else if (hasBase && same(t, b)) source = ours;
    else source = conflict(ctx, `${key}#order`, base, ours, theirs) as string[];
  }
  const other = source === ours ? theirs : ours;
  const order = source.slice();
  other.forEach((id, i) => {
    if (order.includes(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const previous = order.indexOf(other[j] as string);
      if (previous !== -1) {
        at = previous + 1;
        break;
      }
    }
    order.splice(at, 0, id);
  });
  return order;
}

function mergeIdList(
  ctx: Ctx,
  key: string,
  base: Array<{ id: string }> | undefined,
  ours: Array<{ id: string }>,
  theirs: Array<{ id: string }>,
): Json {
  const byId = (list: Array<{ id: string }> | undefined) => new Map((list ?? []).map((item) => [item.id, item]));
  const b = byId(base);
  const o = byId(ours);
  const t = byId(theirs);
  const order = mergeOrder(
    ctx,
    key,
    (base ?? []).map((item) => item.id),
    ours.map((item) => item.id),
    theirs.map((item) => item.id),
    base !== undefined,
  );
  const out: Json[] = [];
  for (const id of order) {
    const itemKey = `${key}[${id}]`;
    const [bi, oi, ti] = [b.get(id), o.get(id), t.get(id)];
    if (oi && ti) {
      out.push(merge(ctx, itemKey, bi, oi, ti));
    } else if (oi) {
      // Theirs does not have it: they deleted it, unless it is new on our side.
      if (!bi || same(bi, oi)) {
        if (!bi) out.push(oi);
      } else if (conflict(ctx, itemKey, bi, oi, undefined) !== undefined) out.push(oi);
    } else if (ti) {
      if (!bi || same(bi, ti)) {
        if (!bi) out.push(ti);
      } else if (conflict(ctx, itemKey, bi, undefined, ti) !== undefined) out.push(ti);
    }
  }
  return out;
}

function merge(ctx: Ctx, key: string, base: Json, ours: Json, theirs: Json): Json {
  if (same(ours, theirs)) return ours;
  if (base !== undefined) {
    if (same(base, ours)) return theirs;
    if (same(base, theirs)) return ours;
  }
  if (isRecord(ours) && isRecord(theirs) && (base === undefined || isRecord(base))) {
    const out: Record<string, Json> = {};
    const keys = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])];
    for (const field of keys) {
      const value = merge(ctx, key ? `${key}.${field}` : field, (base as Record<string, Json> | undefined)?.[field], ours[field], theirs[field]);
      if (value !== undefined) out[field] = value;
    }
    return out;
  }
  if (hasIds(ours) && hasIds(theirs) && (base === undefined || hasIds(base))) {
    return mergeIdList(ctx, key, base as Array<{ id: string }> | undefined, ours, theirs);
  }
  if (Array.isArray(ours) && Array.isArray(theirs) && ours.length === theirs.length && (base === undefined || (Array.isArray(base) && base.length === ours.length))) {
    return ours.map((item, i) => merge(ctx, `${key}[${i}]`, (base as Json[] | undefined)?.[i], item, theirs[i]));
  }
  return conflict(ctx, key, base, ours, theirs);
}

/**
 * Merge `theirs` (on `main`) into `ours` (this device), given the `base` both started from.
 * Pass `decisions` to settle the conflicts a first call reported, then call again.
 */
export function mergeDocuments(
  base: TwildaDocument | null,
  ours: TwildaDocument,
  theirs: TwildaDocument,
  decisions: Record<string, MergeChoice> = {},
): MergeResult {
  const ctx: Ctx = { conflicts: [], decisions, ours, theirs };
  const strip = (doc: TwildaDocument | null) => {
    if (!doc) return undefined;
    const { status: _status, updatedAt: _updatedAt, ...rest } = doc;
    return rest;
  };
  const merged = merge(ctx, "", strip(base), strip(ours), strip(theirs)) as Record<string, Json>;
  return {
    doc: { ...merged, status: ours.status, updatedAt: ours.updatedAt } as TwildaDocument,
    conflicts: ctx.conflicts,
    theirsChanged: base ? !same(strip(base), strip(theirs)) : true,
  };
}

// ---- site settings ------------------------------------------------------------------------

function leavesOf(value: Json, prefix: string, out: Map<string, Json>): void {
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) leavesOf(child, prefix ? `${prefix}.${key}` : key, out);
    return;
  }
  out.set(prefix, value);
}

function setLeaf(target: Record<string, Json>, path: string, value: Json | undefined): void {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(node[key])) node[key] = {};
    node = node[key] as Record<string, Json>;
  }
  const last = keys[keys.length - 1] as string;
  if (value === undefined) delete node[last];
  else node[last] = value;
}

export interface SiteMergeResult {
  site: SiteSettings;
  conflicts: MergeConflict[];
  theirsChanged: boolean;
}

/** The same three-way rule as documents, applied per setting: `theme.colors.paper`, `chrome.name`. A list (the nav) is one setting. */
export function mergeSites(
  base: SiteSettings | null,
  ours: SiteSettings,
  theirs: SiteSettings,
  decisions: Record<string, MergeChoice> = {},
): SiteMergeResult {
  const b = new Map<string, Json>();
  const o = new Map<string, Json>();
  const t = new Map<string, Json>();
  if (base) leavesOf(base, "", b);
  leavesOf(ours, "", o);
  leavesOf(theirs, "", t);
  const result = structuredClone(ours) as unknown as Record<string, Json>;
  const conflicts: MergeConflict[] = [];
  const keys = new Set([...o.keys(), ...t.keys()]);
  for (const key of [...keys].sort()) {
    const mine = o.get(key);
    const theirsValue = t.get(key);
    const original = base ? b.get(key) : undefined;
    if (same(mine, theirsValue)) continue;
    if (base && same(original, mine)) {
      setLeaf(result, key, theirsValue);
      continue;
    }
    if (base && same(original, theirsValue)) continue;
    const decision = decisions[key];
    if (decision === "theirs") setLeaf(result, key, theirsValue);
    if (!decision) {
      conflicts.push({ key, label: `Site: ${key.replace(/\./g, " / ")}`, base: original, ours: mine, theirs: theirsValue });
    }
  }
  return {
    site: result as unknown as SiteSettings,
    conflicts,
    theirsChanged: base ? !same(base, theirs) : true,
  };
}
