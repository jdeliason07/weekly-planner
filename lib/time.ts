// Time helpers for the 06:00–23:00 planning grid. Times are "HH:MM" 24h.

export const GRID_START_MIN = 6 * 60; // 06:00
export const GRID_END_MIN = 23 * 60; // 23:00

export function toMinutes(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Hours as a decimal, e.g. 90 minutes -> 1.5.
export function durationHours(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return (e - s) / 60;
}

// True when [start,end) parses, is ordered, and falls inside 06:00–23:00.
export function isValidGridRange(start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  if (s >= e) return false;
  return s >= GRID_START_MIN && e <= GRID_END_MIN;
}

export const DAY_LABELS_FROM_SUNDAY = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

// Given a week that starts on `weekStartsOn` (0=Sun), the label for column i.
export function dayLabel(columnIndex: number, weekStartsOn: number): string {
  return DAY_LABELS_FROM_SUNDAY[(weekStartsOn + columnIndex) % 7];
}

// Parse a short day token ("Mon", "monday", "0"..."6") to a column index for
// a week starting on `weekStartsOn`. Returns null when it can't resolve.
export function resolveDayColumn(
  token: string,
  weekStartsOn: number
): number | null {
  const t = token.trim().toLowerCase();
  if (/^[0-6]$/.test(t)) {
    // Interpreted as a column index directly.
    return Number(t);
  }
  const idx = DAY_LABELS_FROM_SUNDAY.findIndex(
    (d) => d.toLowerCase() === t.slice(0, 3)
  );
  if (idx === -1) return null;
  // Convert absolute weekday to a column index for this week.
  return (idx - weekStartsOn + 7) % 7;
}

export function hhmmToPercent(hhmm: string): number {
  const m = toMinutes(hhmm);
  return ((m - GRID_START_MIN) / (GRID_END_MIN - GRID_START_MIN)) * 100;
}
