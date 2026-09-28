/**
 * Pure date helpers for recurring items and bills.
 * No database imports here, so this file is safe to use on the client too.
 */

export function nextOccurrence(date, repeat) {
  const d = new Date(date);
  switch (repeat) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly': {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
      break;
    }
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d;
}

/** Advances a recurring date until it is in the future */
export function nextFutureOccurrence(date, repeat, now = new Date()) {
  let d = new Date(date);
  let guard = 0;
  while (d <= now && guard < 1000) {
    const n = nextOccurrence(d, repeat);
    if (!n) return null;
    d = n;
    guard += 1;
  }
  return d;
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function monthRange(key) {
  const [y, m] = key.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

/** Due date + period key of a bill for the period containing `ref` */
function billForPeriod(bill, ref) {
  const y = ref.getFullYear();
  if (bill.frequency === 'yearly') {
    const mi = (bill.dueMonth || 1) - 1;
    const due = new Date(y, mi, Math.min(bill.dueDay, daysInMonth(y, mi)), 9, 0, 0);
    return { period: String(y), dueDate: due };
  }
  const mi = ref.getMonth();
  const due = new Date(y, mi, Math.min(bill.dueDay, daysInMonth(y, mi)), 9, 0, 0);
  return { period: monthKey(ref), dueDate: due };
}

/**
 * The next unpaid occurrence of a bill.
 * Returns { period, dueDate, daysLeft, status: 'overdue' | 'due-soon' | 'upcoming' }
 */
export function nextBillDue(bill, now = new Date()) {
  let cur = billForPeriod(bill, now);
  const paid = new Set(bill.paidPeriods || []);
  // A period whose due date passed before the bill was added doesn't count as overdue
  const created = bill.createdAt ? new Date(bill.createdAt) : null;
  if (created) created.setHours(0, 0, 0, 0);
  const skip = paid.has(cur.period) || (created && cur.dueDate < created);
  if (skip) {
    const ref = new Date(now);
    if (bill.frequency === 'yearly') ref.setFullYear(ref.getFullYear() + 1);
    else {
      ref.setDate(1);
      ref.setMonth(ref.getMonth() + 1);
    }
    cur = billForPeriod(bill, ref);
  }
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const dueDay = new Date(cur.dueDate);
  dueDay.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((dueDay - startToday) / 86400000);
  const status =
    daysLeft < 0 ? 'overdue' : daysLeft <= (bill.remindDaysBefore ?? 2) ? 'due-soon' : 'upcoming';
  return { ...cur, daysLeft, status, paid: paid.has(cur.period) };
}
