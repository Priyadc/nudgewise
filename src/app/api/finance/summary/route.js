import mongoose from 'mongoose';
import { route, ok } from '@/lib/api';
import { monthBounds, isMonthKey, currentMonthKey, shiftMonth } from '@/lib/months';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';

/**
 * GET /api/finance/summary?month=2026-09&tz=-330
 * Totals, category breakdown, 6-month trend and budget usage for one month.
 */
export const GET = route(async (req, { userId }) => {
  const sp = new URL(req.url).searchParams;
  const tz = Number(sp.get('tz') || 0);
  const month = isMonthKey(sp.get('month')) ? sp.get('month') : currentMonthKey(tz);
  const { start, end } = monthBounds(month, tz);
  const uid = new mongoose.Types.ObjectId(userId);

  const [totals, byCategory, budgets, byMethod] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Budget.find({ user: userId }).lean(),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  // Six-month trend ending at the selected month
  const trendKeys = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const trendStart = monthBounds(trendKeys[0], tz).start;
  const trendRaw = await Transaction.aggregate([
    { $match: { user: uid, date: { $gte: trendStart, $lt: end } } },
    {
      $group: {
        _id: {
          m: { $dateToString: { format: '%Y-%m', date: '$date', timezone: tzToOffsetString(tz) } },
          t: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const trend = trendKeys.map((k) => ({
    month: k,
    income: trendRaw.find((r) => r._id.m === k && r._id.t === 'income')?.total || 0,
    expense: trendRaw.find((r) => r._id.m === k && r._id.t === 'expense')?.total || 0,
  }));

  const income = totals.find((t) => t._id === 'income')?.total || 0;
  const expense = totals.find((t) => t._id === 'expense')?.total || 0;
  const spentBy = Object.fromEntries(byCategory.map((c) => [c._id, c.total]));

  return ok({
    month,
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
    count: totals.reduce((s, t) => s + t.count, 0),
    byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, count: c.count })),
    trend,
    byMethod: byMethod.map((m) => ({ method: m._id, total: m.total, count: m.count })),
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit, spent: spentBy[b.category] || 0 })),
  });
});

/** -330 (browser offset for IST) → "+05:30" for MongoDB date operators */
function tzToOffsetString(tzOffset) {
  const mins = -Number(tzOffset || 0);
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
