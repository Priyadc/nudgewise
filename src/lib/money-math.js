/**
 * Pure money-planning helpers (no database imports — safe on the client too).
 * Day keys are 'YYYY-MM-DD' strings in the user's local calendar.
 * `tzOffset` is the browser's getTimezoneOffset() value (IST = -330).
 */

/** Category treated as "putting money aside" rather than spending */
export const SAVINGS_CATEGORY = 'Investments & Savings';

export function dayKey(date, tzOffset = 0) {
  return new Date(new Date(date).getTime() - (Number(tzOffset) || 0) * 60000).toISOString().slice(0, 10);
}

/** The instant a local day starts, e.g. '2026-10-01' in IST → 2026-09-30T18:30:00Z */
export function dayStartOf(key, tzOffset = 0) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (Number(tzOffset) || 0) * 60000);
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysInMonthOf(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** '2026-10-14' → 14 */
export const dom = (key) => Number(key.slice(8, 10));

/**
 * Unpaid due dates of a bill between two day keys (from inclusive, to exclusive).
 * Mirrors nextBillDue(): paid periods and dates before the bill existed are skipped.
 */
export function billOccurrences(bill, fromKey, toKey) {
  const out = [];
  const paid = new Set(bill.paidPeriods || []);
  const createdKey = bill.createdAt ? new Date(bill.createdAt).toISOString().slice(0, 10) : null;
  let y = Number(fromKey.slice(0, 4));
  let m = Number(fromKey.slice(5, 7));
  for (let guard = 0; guard < 36; guard += 1) {
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    if (monthStart >= toKey) break;
    const isYearly = bill.frequency === 'yearly';
    if (!isYearly || (bill.dueMonth || 1) === m) {
      const day = Math.min(bill.dueDay, daysInMonthOf(y, m));
      const key = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const period = isYearly ? String(y) : `${y}-${String(m).padStart(2, '0')}`;
      if (key >= fromKey && key < toKey && !paid.has(period) && !(createdKey && key < createdKey)) {
        out.push({ key, period, _id: bill._id, name: bill.name, amount: bill.amount, category: bill.category, autopay: Boolean(bill.autopay) });
      }
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/**
 * "Safe to spend": what's left for everyday spending after bills and savings,
 * spread evenly over the days left in the month.
 */
export function computeSafeToSpend({
  incomeActual = 0,
  expectedIncome = 0,
  savePercent = 20,
  savedLogged = 0,
  spentBeforeToday = 0,
  spentToday = 0,
  billsLeftTotal = 0,
  daysLeft = 1,
}) {
  const income = Math.max(incomeActual, expectedIncome);
  const saveTarget = Math.round((income * savePercent) / 100);
  const saveStillToPut = Math.max(0, saveTarget - savedLogged);
  const spendable = income - saveStillToPut - savedLogged - billsLeftTotal - spentBeforeToday;
  const days = Math.max(1, daysLeft);
  const perDay = Math.max(0, Math.floor(spendable / days));
  const leftToday = Math.floor(perDay - spentToday);
  let status = 'good';
  if (income <= 0) status = 'no-income';
  else if (spendable <= 0) status = 'over';
  else if (leftToday < 0) status = 'over-today';
  else if (leftToday < perDay * 0.3) status = 'tight';
  return { income, saveTarget, saveStillToPut, spendable: Math.floor(spendable), perDay, leftToday, status };
}

/**
 * No-spend streak: consecutive days with no everyday spending.
 * Counts back from today (if today is still clean) or yesterday, but never before `startKey`
 * (when the user started tracking), so a brand-new account doesn't get a fake streak.
 */
export function computeNoSpend(spendKeys, startKey, todayKey) {
  const spent = new Set(spendKeys);
  const todayClean = !spent.has(todayKey);
  let count = 0;
  let cursor = todayClean ? todayKey : addDays(todayKey, -1);
  if (!todayClean) {
    // A spend today breaks the streak
    return { count: 0, todayClean, week: weekClean(spent, startKey, todayKey) };
  }
  while (cursor >= startKey && !spent.has(cursor) && count < 400) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, todayClean, week: weekClean(spent, startKey, todayKey) };
}

function weekClean(spent, startKey, todayKey) {
  let n = 0;
  for (let i = 0; i < 7; i += 1) {
    const k = addDays(todayKey, -i);
    if (k >= startKey && !spent.has(k)) n += 1;
  }
  return n;
}

/** Pulls a price out of a shopping item: "Milk ₹45", "Eggs rs 80", "Bread @40" → { title, price } */
export function parsePrice(text) {
  const m = String(text || '').match(/^(.*?)\s*(?:₹|rs\.?|inr|@)\s*(\d+(?:\.\d{1,2})?)\s*$/i);
  if (!m || !m[1].trim()) return { title: String(text || '').trim(), price: null };
  return { title: m[1].trim(), price: Number(m[2]) };
}

/** True for list names that sound like shopping lists */
export const looksLikeShopping = (name = '') => /grocer|shopping|kirana|market|vegetable|sabzi|to buy|buy list|supermarket|dmart/i.test(name);
