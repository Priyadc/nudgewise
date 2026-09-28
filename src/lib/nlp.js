import { getCategories } from '@/lib/categories';

/**
 * Natural-language quick add, similar to Todoist / TickTick.
 *   "Pay rent tomorrow 9am !high #home every month"
 *   "Call mom friday at 6:30pm @Family"
 *   "Submit report in 2 days p1"
 */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseTask(input, now = new Date()) {
  let text = ` ${input} `;
  const result = { title: '', dueDate: null, hasTime: false, priority: 0, tags: [], listName: null, repeat: 'none', remind: false };

  const take = (re, fn) => {
    const m = text.match(re);
    if (m) {
      fn(m);
      text = text.replace(m[0], ' ');
    }
    return m;
  };

  // Priority: !high !medium !low, !!!, p1-p3
  take(/\s(?:!high|!h|!!!|p1)(?=\s)/i, () => (result.priority = 3));
  take(/\s(?:!medium|!med|!m|!!|p2)(?=\s)/i, () => (result.priority = result.priority || 2));
  take(/\s(?:!low|!l|p3)(?=\s)/i, () => (result.priority = result.priority || 1));

  // Tags and list
  let m;
  while ((m = text.match(/\s#([\p{L}\d_-]{1,30})(?=\s)/u))) {
    result.tags.push(m[1].toLowerCase());
    text = text.replace(m[0], ' ');
  }
  take(/\s@([\p{L}\d_-]{1,40})(?=\s)/u, (mm) => (result.listName = mm[1]));

  // Repeat
  take(/\s(?:every\s?day|daily)(?=\s)/i, () => (result.repeat = 'daily'));
  take(/\s(?:every\s?week|weekly)(?=\s)/i, () => (result.repeat = 'weekly'));
  take(/\s(?:every\s?month|monthly)(?=\s)/i, () => (result.repeat = 'monthly'));
  take(/\s(?:every\s?year|yearly|annually)(?=\s)/i, () => (result.repeat = 'yearly'));

  take(/\sremind(?:\s?me)?(?=\s)/i, () => (result.remind = true));

  // Time: "at 5pm", "5:30 pm", "17:00", "noon", "tonight"
  let hours = null;
  let minutes = 0;
  take(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (mm) => {
    hours = Number(mm[1]) % 12;
    if (mm[3].toLowerCase() === 'pm') hours += 12;
    minutes = Number(mm[2] || 0);
  });
  if (hours === null) {
    take(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (mm) => {
      hours = Number(mm[1]);
      minutes = Number(mm[2]);
    });
  }
  if (hours === null) take(/\s(?:at\s)?noon(?=\s)/i, () => (hours = 12));

  // Dates
  let date = null;
  take(/\stonight(?=\s)/i, () => {
    date = startOfDay(now);
    if (hours === null) hours = 20;
  });
  take(/\s(?:today|tod)(?=\s)/i, () => (date = startOfDay(now)));
  take(/\s(?:tomorrow|tmrw|tmr|tom)(?=\s)/i, () => {
    date = startOfDay(now);
    date.setDate(date.getDate() + 1);
  });
  take(/\sin\s(\d{1,3})\s?(minutes?|mins?|hours?|hrs?|days?|weeks?)(?=\s)/i, (mm) => {
    const n = Number(mm[1]);
    const unit = mm[2].toLowerCase();
    const d = new Date(now);
    if (unit.startsWith('min')) {
      d.setMinutes(d.getMinutes() + n);
      hours = d.getHours();
      minutes = d.getMinutes();
    } else if (unit.startsWith('h')) {
      d.setHours(d.getHours() + n);
      hours = d.getHours();
      minutes = d.getMinutes();
    } else if (unit.startsWith('w')) d.setDate(d.getDate() + n * 7);
    else d.setDate(d.getDate() + n);
    date = startOfDay(d);
  });
  take(/\snext\sweek(?=\s)/i, () => {
    date = startOfDay(now);
    date.setDate(date.getDate() + ((8 - date.getDay()) % 7 || 7)); // next Monday
  });
  take(/\snext\smonth(?=\s)/i, () => {
    date = startOfDay(now);
    date.setMonth(date.getMonth() + 1, 1);
  });
  take(/\s(?:on\s)?(?:next\s)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)(?=\s)/i, (mm) => {
    const w = mm[1].toLowerCase();
    const idx = WEEKDAYS.indexOf(w) >= 0 ? WEEKDAYS.indexOf(w) : WEEKDAY_SHORT.indexOf(w);
    date = startOfDay(now);
    const diff = (idx - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + diff);
  });
  // 25/12, 25-12-2026, 25 dec, dec 25
  take(/\s(?:on\s)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?=\s)/, (mm) => {
    const y = mm[3] ? Number(mm[3].length === 2 ? `20${mm[3]}` : mm[3]) : now.getFullYear();
    date = new Date(y, Number(mm[2]) - 1, Number(mm[1]));
    if (!mm[3] && date < startOfDay(now)) date.setFullYear(y + 1);
  });
  take(/\s(?:on\s)?(\d{1,2})(?:st|nd|rd|th)?\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?=\s)/i, (mm) => {
    date = new Date(now.getFullYear(), MONTHS.indexOf(mm[2].toLowerCase()), Number(mm[1]));
    if (date < startOfDay(now)) date.setFullYear(date.getFullYear() + 1);
  });
  take(/\s(?:on\s)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s(\d{1,2})(?:st|nd|rd|th)?(?=\s)/i, (mm) => {
    date = new Date(now.getFullYear(), MONTHS.indexOf(mm[1].toLowerCase()), Number(mm[2]));
    if (date < startOfDay(now)) date.setFullYear(date.getFullYear() + 1);
  });

  if (hours !== null) {
    if (!date) {
      date = startOfDay(now);
      const candidate = new Date(date);
      candidate.setHours(hours, minutes);
      if (candidate < now) date.setDate(date.getDate() + 1);
    }
    date.setHours(hours, minutes, 0, 0);
    result.hasTime = true;
  } else if (date) {
    date.setHours(23, 59, 0, 0); // all-day: end of day
  }
  if (!date && result.repeat !== 'none') {
    date = startOfDay(now);
    date.setHours(23, 59, 0, 0);
  }

  result.dueDate = date;
  result.title = text.replace(/\s+/g, ' ').trim();
  return result;
}

/**
 * Voice / text quick entry for money:
 *   "spent 250 on swiggy"  →  expense, 250, Food & Dining
 *   "got salary 45000"     →  income, 45000, Salary
 */
export function parseTransaction(input) {
  const text = input.toLowerCase();
  const amountMatch = text.replace(/,/g, '').match(/(?:₹|rs\.?|inr|\$)?\s?(\d+(?:\.\d{1,2})?)\s?(k|thousand|lakh|lakhs)?\b/i);
  let amount = amountMatch ? Number(amountMatch[1]) : null;
  if (amount && amountMatch[2]) {
    const u = amountMatch[2].toLowerCase();
    amount *= u.startsWith('lakh') ? 100000 : 1000;
  }

  const incomeWords = /\b(salary|received|got|earned|income|credited|refund|cashback|bonus|stipend)\b/;
  const type = incomeWords.test(text) ? 'income' : 'expense';
  const cats = getCategories(type);
  // The user's own category names count as keywords too ("spent 400 on gym supplements")
  const category =
    cats.find((c) => c.custom && text.includes(c.name.toLowerCase()))?.name ||
    cats.find((c) => c.keywords.some((k) => text.includes(k)))?.name ||
    (type === 'income' ? 'Other Income' : 'Other');

  let method = 'upi';
  if (/\bcash\b/.test(text)) method = 'cash';
  else if (/\b(card|credit card|debit card)\b/.test(text)) method = 'card';
  else if (/\b(neft|imps|bank|transfer)\b/.test(text)) method = 'bank';

  const note = input
    .replace(/(?:₹|rs\.?|inr|\$)?\s?\d[\d,]*(?:\.\d{1,2})?\s?(k|thousand|lakh|lakhs)?\b/i, ' ')
    .replace(/\b(spent|paid|pay|for|on|got|received|earned|via|using|by|rupees|rs|upi|cash|card|credit card|debit card|neft|imps)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { type, amount, category, method, note: note.charAt(0).toUpperCase() + note.slice(1) };
}
