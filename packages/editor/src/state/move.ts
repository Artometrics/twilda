/** Move an item so it occupies `to` after the move. Out-of-range indexes return a copy. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    !Number.isInteger(from) ||
    !Number.isInteger(to)
  ) {
    return items.slice();
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return items.slice();
  next.splice(to, 0, item);
  return next;
}

export function moveById<T extends { id: string }>(items: readonly T[], id: string, to: number): T[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return items.slice();
  return moveItem(items, from, to);
}
