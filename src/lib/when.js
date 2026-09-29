/**
 * Date/time helpers for the chip-based pickers.
 * Dates are local "YYYY-MM-DD" strings and times are local "HH:MM" strings, so nothing shifts by timezone.
 */

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Preset days: Today, Tomorrow, (This|Next) weekend, Next week */
export function dayPresets(now = new Date()) {
  const today = startOfToday(now);
  const dow = today.getDay();
  const isWeekend = dow === 6 || dow === 0;
  const toSaturday = isWeekend ? (dow === 6 ? 7 : 6) : 6 - dow;
  const toMonday = (8 - dow) % 7 || 7;
  return [
    { value: ymd(today), label: 'Today' },
    { value: ymd(addDays(today, 1)), label: 'Tomorrow' },
    { value: ymd(addDays(today, toSaturday)), label: isWeekend ? 'Next weekend' : 'This weekend' },
    { value: ymd(addDays(today, toMonday)), label: 'Next week' },
  ];
}

export const TIME_PRESETS = [
  { value: '09:00', label: '9 AM', part: 'Morning' },
  { value: '13:00', label: '1 PM', part: 'Afternoon' },
  { value: '18:00', label: '6 PM', part: 'Evening' },
  { value: '21:00', label: '9 PM', part: 'Night' },
];

/** Local Date from "YYYY-MM-DD" + optional "HH:MM" (all-day items end at 23:59) */
export function buildDate(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '23:59'}:00`);
}

export const REMIND_WITH_TIME = [
  { value: 'none', label: 'No reminder' },
  { value: 'at', label: 'On time' },
  { value: '10m', label: '10 min before' },
  { value: '1h', label: '1 hour before' },
  { value: '1d', label: '1 day before' },
  { value: 'custom', label: 'Custom' },
];
export const REMIND_ALL_DAY = [
  { value: 'none', label: 'No reminder' },
  { value: 'morning', label: 'That morning, 9 AM' },
  { value: 'eve', label: 'Evening before, 6 PM' },
  { value: 'custom', label: 'Custom' },
];
export const REMIND_NO_DATE = [
  { value: 'none', label: 'No reminder' },
  { value: 'custom', label: 'Pick a time' },
];

export function remindOptions(date, time) {
  if (!date) return REMIND_NO_DATE;
  return time ? REMIND_WITH_TIME : REMIND_ALL_DAY;
}

const MIN = 60000;

/** Turns the reminder choice into an actual Date (or null) */
export function buildReminder(date, time, remind, custom) {
  if (!remind || remind === 'none') return null;
  if (remind === 'custom') return custom ? new Date(custom) : null;
  if (!date) return null;
  if (remind === 'morning') return new Date(`${date}T09:00:00`);
  if (remind === 'eve') {
    const d = new Date(`${date}T18:00:00`);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const due = buildDate(date, time);
  const offset = { at: 0, '10m': 10 * MIN, '1h': 60 * MIN, '1d': 1440 * MIN }[remind];
  return offset === undefined ? null : new Date(due.getTime() - offset);
}

/** Reverse of buildReminder: works out which chip matches an existing task */
export function deriveRemind(dueDate, hasTime, reminderAt) {
  if (!reminderAt) return { remind: 'none', custom: '' };
  const r = new Date(reminderAt);
  const custom = `${ymd(r)}T${hm(r)}`;
  if (dueDate) {
    const due = new Date(dueDate);
    const date = ymd(due);
    const time = hasTime ? hm(due) : '';
    const options = remindOptions(date, time).map((o) => o.value).filter((v) => v !== 'none' && v !== 'custom');
    for (const v of options) {
      const b = buildReminder(date, time, v, '');
      if (b && Math.abs(b.getTime() - r.getTime()) < MIN) return { remind: v, custom };
    }
  }
  return { remind: 'custom', custom };
}

/** Friendly description: "Tomorrow at 9:00 AM", "Sat 4 Oct", "Today" */
export function describeWhen(date, time, now = new Date()) {
  if (!date) return '';
  const d = buildDate(date, time);
  const today = startOfToday(now);
  const diff = Math.round((startOfToday(d) - today) / 86400000);
  let day;
  if (diff === 0) day = 'Today';
  else if (diff === 1) day = 'Tomorrow';
  else if (diff === -1) day = 'Yesterday';
  else if (diff > 1 && diff < 7) day = d.toLocaleDateString(undefined, { weekday: 'long' });
  else day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (!time) return day;
  return `${day} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function describeDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return describeWhen(ymd(d), hm(d));
}

/** Same as describeWhen, but reads well mid-sentence: "today at 9:00 AM", "on Sat 4 Oct" */
export function describeWhenInline(date, time, now = new Date()) {
  const s = describeWhen(date, time, now);
  if (!s) return '';
  if (/^(Today|Tomorrow|Yesterday)/.test(s)) return s[0].toLowerCase() + s.slice(1);
  return `on ${s}`;
}

export function describeDateInline(value) {
  if (!value) return '';
  const d = new Date(value);
  return describeWhenInline(ymd(d), hm(d));
}
