/**
 * Streak = consecutive days (ending today, or yesterday if nothing is done yet today)
 * with at least one completed task. `days` are 'YYYY-MM-DD' strings in the user's local time.
 */
export function computeStreak(days, tzOffset = 0, now = new Date()) {
  const set = new Set(days);
  const key = (d) => d.toISOString().slice(0, 10);
  // Local "today" expressed as a UTC date so toISOString gives the local calendar day
  const local = new Date(now.getTime() - (Number(tzOffset) || 0) * 60000);
  const cursor = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const doneToday = set.has(key(cursor));
  if (!doneToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (set.has(key(cursor))) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { count, doneToday };
}
