export function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function streak(dates: string[], today: string): { current: number; longest: number } {
  const sorted = [...new Set(dates)].sort();
  let longest = 0, run = 0, previous = '';
  for (const day of sorted) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const set = new Set(sorted);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  return { current, longest };
}

export function progress(completed: string[], manifest: string[]): { count: number; total: number; percent: number } {
  const eligible = new Set(manifest);
  const count = new Set(completed.filter(id => eligible.has(id))).size;
  return { count, total: eligible.size, percent: eligible.size ? Math.round(count * 100 / eligible.size) : 0 };
}
