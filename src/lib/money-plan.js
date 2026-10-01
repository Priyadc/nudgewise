import mongoose from 'mongoose';
import Transaction from '@/models/Transaction';
import Bill from '@/models/Bill';
import Task from '@/models/Task';
import User from '@/models/User';
import {
  SAVINGS_CATEGORY,
  addDays,
  billOccurrences,
  computeNoSpend,
  computeSafeToSpend,
  dayKey,
  dayStartOf,
  daysInMonthOf,
  dom,
} from '@/lib/money-math';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** -330 (browser offset for IST) → "+05:30" for MongoDB date operators */
export function offsetString(tzOffset) {
  const mins = -Number(tzOffset || 0);
  const abs = Math.abs(mins);
  return `${mins >= 0 ? '+' : '-'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Browser-style offset (IST = -330) for an IANA zone, used when there is no browser (cron jobs) */
export function zoneOffset(timeZone = 'Asia/Kolkata', at = new Date()) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(at)
        .map((p) => [p.type, p.value])
    );
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return -Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  } catch {
    return -330;
  }
}

/** Everyday spending = expenses that are not bill payments and not money put aside */
const everyday = (t) => t.type === 'expense' && !t.bill && t.category !== SAVINGS_CATEGORY;

function monthWindow(todayKey) {
  const y = Number(todayKey.slice(0, 4));
  const m = Number(todayKey.slice(5, 7));
  const startKey = `${todayKey.slice(0, 7)}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { y, m, startKey, endKey: next, dim: daysInMonthOf(y, m) };
}

/**
 * Safe-to-spend for today plus everything the salary plan needs.
 */
export async function buildMoneyPlan(userId, tz = 0, now = new Date()) {
  const todayKey = dayKey(now, tz);
  const { startKey, endKey, dim } = monthWindow(todayKey);
  const start = dayStartOf(startKey, tz);
  const end = dayStartOf(endKey, tz);
  const todayStart = dayStartOf(todayKey, tz);

  const [user, txns, bills] = await Promise.all([
    User.findById(userId).select('settings').lean(),
    Transaction.find({ user: userId, date: { $gte: start, $lt: end } }).select('type amount category date bill').lean(),
    Bill.find({ user: userId, active: true }).lean(),
  ]);
  const s = user?.settings || {};

  let incomeActual = 0;
  let salaryThisMonth = 0;
  let savedLogged = 0;
  let spentBeforeToday = 0;
  let spentToday = 0;
  let billsPaid = 0;
  for (const t of txns) {
    if (t.type === 'income') {
      incomeActual += t.amount;
      if (t.category === 'Salary') salaryThisMonth += t.amount;
    } else if (t.category === SAVINGS_CATEGORY) savedLogged += t.amount;
    else if (new Date(t.date) >= todayStart) spentToday += t.amount;
    else spentBeforeToday += t.amount;
    if (t.type === 'expense' && t.bill) billsPaid += t.amount;
  }

  const billsLeft = bills
    .flatMap((b) => billOccurrences(b, startKey, endKey))
    .map((o) => ({ ...o, overdue: o.key < todayKey }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const billsLeftTotal = billsLeft.reduce((sum, b) => sum + b.amount, 0);
  const daysLeft = dim - dom(todayKey) + 1;
  const savePercent = Number.isFinite(s.savePercent) ? s.savePercent : 20;

  const safe = computeSafeToSpend({
    incomeActual,
    expectedIncome: s.monthlyIncome || 0,
    savePercent,
    savedLogged,
    spentBeforeToday,
    spentToday,
    billsLeftTotal,
    daysLeft,
  });

  return {
    month: todayKey.slice(0, 7),
    today: todayKey,
    daysLeft,
    daysInMonth: dim,
    incomeActual,
    salaryThisMonth,
    expectedIncome: s.monthlyIncome || 0,
    savePercent,
    savedLogged,
    spentBeforeToday,
    spentToday,
    billsPaid,
    billsLeft,
    billsLeftTotal,
    ...safe,
  };
}

/**
 * No-spend days: days with no everyday spending, counted from when the user started tracking.
 * Returns null until the user has logged at least one expense.
 */
export async function buildNoSpend(userId, tz = 0, now = new Date()) {
  const user = await User.findById(userId).select('createdAt').lean();
  const from = new Date(Math.max(new Date(user?.createdAt || now).getTime(), now.getTime() - 120 * 86400000));
  const [days, any] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: oid(userId), type: 'expense', bill: null, category: { $ne: SAVINGS_CATEGORY }, date: { $gte: dayStartOf(dayKey(from, tz), tz) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: offsetString(tz) } } } },
    ]),
    Transaction.exists({ user: userId, type: 'expense' }),
  ]);
  if (!any) return null;
  return computeNoSpend(days.map((d) => d._id), dayKey(from, tz), dayKey(now, tz));
}

/**
 * Month-ahead cash calendar: expected balance for each of the next `days` days,
 * using bills, the usual salary day and the average everyday spend.
 */
export async function buildCashCalendar(userId, tz = 0, now = new Date(), days = 35) {
  const todayKey = dayKey(now, tz);
  const { startKey, endKey: monthEndKey } = monthWindow(todayKey);
  const start = dayStartOf(startKey, tz);
  const todayStart = dayStartOf(todayKey, tz);
  const lastKey = addDays(todayKey, days);

  const [user, monthTxns, recent, bills, lastSalary] = await Promise.all([
    User.findById(userId).select('settings createdAt').lean(),
    Transaction.find({ user: userId, date: { $gte: start, $lt: dayStartOf(monthEndKey, tz) } }).select('type amount category date bill').lean(),
    Transaction.find({ user: userId, type: 'expense', bill: null, category: { $ne: SAVINGS_CATEGORY }, date: { $gte: new Date(todayStart.getTime() - 30 * 86400000), $lt: todayStart } })
      .select('amount')
      .lean(),
    Bill.find({ user: userId, active: true }).lean(),
    Transaction.findOne({ user: userId, type: 'income', category: 'Salary', date: { $gte: new Date(now.getTime() - 75 * 86400000) } })
      .sort({ date: -1 })
      .select('amount date')
      .lean(),
  ]);

  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const spentToday = monthTxns.filter((t) => everyday(t) && new Date(t.date) >= todayStart).reduce((s, t) => s + t.amount, 0);
  const salaryReceivedThisMonth = monthTxns.some((t) => t.type === 'income' && t.category === 'Salary');

  // Average everyday spend per day over the last 30 days (or since the account was made)
  const trackedDays = Math.min(30, Math.max(7, Math.round((todayStart - new Date(user?.createdAt || now)) / 86400000)));
  const avgDaily = Math.round(recent.reduce((s, t) => s + t.amount, 0) / trackedDays);

  const salary = lastSalary
    ? { day: dom(dayKey(lastSalary.date, tz)), amount: user?.settings?.monthlyIncome || lastSalary.amount }
    : null;

  // Unpaid bills from the start of this month (overdue ones land on today)
  const occ = bills.flatMap((b) => billOccurrences(b, startKey, lastKey));
  const byDay = new Map();
  for (const o of occ) {
    const k = o.key < todayKey ? todayKey : o.key;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push({ _id: o._id, name: o.name, amount: o.amount, category: o.category, autopay: o.autopay, overdue: o.key < todayKey });
  }

  let balance = income - expense;
  const startBalance = balance;
  const out = [];
  let lowest = null;
  let firstShort = null;
  for (let i = 0; i < days; i += 1) {
    const key = addDays(todayKey, i);
    const y = Number(key.slice(0, 4));
    const m = Number(key.slice(5, 7));
    const dayBills = byDay.get(key) || [];
    const billTotal = dayBills.reduce((s, b) => s + b.amount, 0);
    const isSalaryDay = salary && dom(key) === Math.min(salary.day, daysInMonthOf(y, m)) && !(key.slice(0, 7) === todayKey.slice(0, 7) && salaryReceivedThisMonth);
    const salaryIn = isSalaryDay ? salary.amount : 0;
    const spend = i === 0 ? Math.max(0, avgDaily - spentToday) : avgDaily;
    balance = balance + salaryIn - billTotal - spend;
    const day = { key, bills: dayBills, salary: salaryIn, spend, balance: Math.round(balance) };
    out.push(day);
    if (!lowest || day.balance < lowest.balance) lowest = { key, balance: day.balance };
    if (!firstShort && day.balance < 0) firstShort = { key, balance: day.balance, because: dayBills.map((b) => b.name) };
  }

  return { today: todayKey, startBalance: Math.round(startBalance), avgDaily, salary, days: out, lowest, firstShort };
}

/** Numbers for one week's recap (weekStart inclusive, weekEnd exclusive) */
export async function buildWeekRecap(userId, tz, weekStart, weekEnd) {
  const uid = oid(userId);
  const prevStart = new Date(weekStart.getTime() - 7 * 86400000);
  const [txns, prev, tasksDone] = await Promise.all([
    Transaction.find({ user: uid, date: { $gte: weekStart, $lt: weekEnd } }).select('type amount category date bill').lean(),
    Transaction.find({ user: uid, type: 'expense', date: { $gte: prevStart, $lt: weekStart } }).select('amount category bill type').lean(),
    Task.countDocuments({ owner: uid, completedAt: { $gte: weekStart, $lt: weekEnd } }),
  ]);
  const spent = txns.filter(everyday).reduce((s, t) => s + t.amount, 0);
  const lastWeekSpent = prev.filter(everyday).reduce((s, t) => s + t.amount, 0);
  const spendDays = new Set(txns.filter(everyday).map((t) => dayKey(t.date, tz)));
  const startKey = dayKey(weekStart, tz);
  let noSpendDays = 0;
  for (let i = 0; i < 7; i += 1) if (!spendDays.has(addDays(startKey, i))) noSpendDays += 1;
  const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const changePct = lastWeekSpent > 0 ? Math.round(((spent - lastWeekSpent) / lastWeekSpent) * 100) : null;
  return { spent, lastWeekSpent, changePct, noSpendDays, tasksDone, income, logged: txns.length };
}
