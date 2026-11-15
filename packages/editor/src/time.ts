const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "Just now", "12 minutes ago", "3 hours ago", "yesterday", then a short date after a week. */
export function formatEdited(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Never edited";
  const diff = now.getTime() - then.getTime();
  if (diff < 45_000) return "Just now";
  if (diff < 7 * 86_400_000) {
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, size] of UNITS) {
      if (diff >= size) return formatter.format(-Math.floor(diff / size), unit);
    }
    return formatter.format(-1, "minute");
  }
  return then.toLocaleDateString("en", { month: "short", day: "numeric", year: then.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
