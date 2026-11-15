/**
 * Undo and redo over whole-document snapshots. Pure and immutable, so a reducer
 * can hold it. Edits made to the same field within `windowMs` collapse into one
 * step, so typing a sentence is one undo and not forty.
 */

export interface History<T> {
  past: T[];
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 1200;

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [], lastKey: null, lastAt: 0 };
}

/** Record that `previous` was replaced by something else. `key` names the field when there is one. */
export function recordChange<T>(
  history: History<T>,
  previous: T,
  options: { key?: string | null; at?: number; limit?: number; windowMs?: number } = {},
): History<T> {
  const at = options.at ?? Date.now();
  const key = options.key ?? null;
  const windowMs = options.windowMs ?? COALESCE_MS;
  const merge = key !== null && key === history.lastKey && at - history.lastAt <= windowMs && history.past.length > 0;
  if (merge) return { ...history, future: [], lastAt: at };
  const past = [...history.past, previous];
  const limit = options.limit ?? HISTORY_LIMIT;
  return { past: past.length > limit ? past.slice(past.length - limit) : past, future: [], lastKey: key, lastAt: at };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>, current: T): { history: History<T>; value: T } | null {
  const value = history.past.at(-1);
  if (value === undefined) return null;
  return {
    value,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future], lastKey: null, lastAt: 0 },
  };
}

export function redo<T>(history: History<T>, current: T): { history: History<T>; value: T } | null {
  const value = history.future[0];
  if (value === undefined) return null;
  return {
    value,
    history: { past: [...history.past, current], future: history.future.slice(1), lastKey: null, lastAt: 0 },
  };
}
