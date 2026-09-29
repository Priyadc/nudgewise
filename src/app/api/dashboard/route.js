import mongoose from 'mongoose';
import { route, ok, dateParam } from '@/lib/api';
import { taskScope } from '@/lib/access';
import { monthBounds, currentMonthKey, shiftMonth } from '@/lib/months';
import { computeStreak } from '@/lib/streak';
import { nextBillDue } from '@/lib/recurrence';
import Task from '@/models/Task';
import Reminder from '@/models/Reminder';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';
import Bill from '@/models/Bill';

/** Everything the dashboard needs in one round-trip */
export const GET = route(async (req, { userId }) => {
  const sp = new URL(req.url).searchParams;
  const tz = Number(sp.get('tz') || 0);
  const dayStart = dateParam(sp, 'dayStart', new Date(new Date().setHours(0, 0, 0, 0)));
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const weekAgo = new Date(dayStart.getTime() - 6 * 86400000);
  const scope = await taskScope(userId);
  const { start, end } = monthBounds(currentMonthKey(tz), tz);
  const uid = new mongoose.Types.ObjectId(userId);

  const monthKey = currentMonthKey(tz);
  const last = monthBounds(shiftMonth(monthKey, -1), tz);
  const prev = monthBounds(shiftMonth(monthKey, -2), tz);
  const streakFrom = new Date(dayStart.getTime() - 120 * 86400000);

  const [today, overdue, doneToday, completedWeek, totalOpen, reminders, money, topCats, budgets, bills, weekly, lastMonthAgg, prevMonthAgg, streakDays] =
    await Promise.all([
      Task.find({ $and: [scope, { done: false, dueDate: { $ne: null, $lt: dayEnd } }] })
        .sort({ dueDate: 1, priority: -1 })
        .limit(8)
        .populate('list', 'name color icon')
        .lean(),
      Task.countDocuments({ $and: [scope, { done: false, dueDate: { $ne: null, $lt: dayStart } }] }),
      Task.countDocuments({ $and: [scope, { done: true, completedAt: { $gte: dayStart } }] }),
      Task.countDocuments({ $and: [scope, { done: true, completedAt: { $gte: weekAgo } }] }),
      Task.countDocuments({ $and: [scope, { done: false }] }),
      Reminder.find({ user: userId, status: 'active', remindAt: { $gte: new Date() } }).sort({ remindAt: 1 }).limit(5).lean(),
      Transaction.aggregate([
        { $match: { user: uid, date: { $gte: start, $lt: end } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: uid, type: 'expense', date: { $gte: start, $lt: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Budget.find({ user: userId }).lean(),
      Bill.find({ user: userId, active: true }).lean(),
      Task.aggregate([
        { $match: { $and: [scope, { done: true, completedAt: { $gte: weekAgo } }] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: offsetString(tz) } }, n: { $sum: 1 } } },
      ]),
      monthTotals(uid, last),
      monthTotals(uid, prev),
      Task.aggregate([
        { $match: { $and: [scope, { completedAt: { $gte: streakFrom } }] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: offsetString(tz) } } } },
      ]),
    ]);

  const income = money.find((m) => m._id === 'income')?.total || 0;
  const expense = money.find((m) => m._id === 'expense')?.total || 0;
  const now = new Date();

  // Completed tasks per day for the last 7 days (for the activity sparkline)
  const activity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000 - tz * 60000);
    const key = d.toISOString().slice(0, 10);
    return { day: key, count: weekly.find((w) => w._id === key)?.n || 0 };
  });

  return ok({
    tasks: { today, overdue, doneToday, completedWeek, totalOpen },
    reminders,
    finance: {
      income,
      expense,
      balance: income - expense,
      budgetTotal: budgets.reduce((s, b) => s + b.limit, 0),
      topCategories: topCats.map((c) => ({ category: c._id, total: c.total })),
    },
    bills: bills
      .map((b) => ({ _id: b._id, name: b.name, amount: b.amount, category: b.category, autopay: Boolean(b.autopay), next: nextBillDue(b, now) }))
      .filter((b) => b.next.daysLeft <= 10)
      .sort((a, b) => a.next.daysLeft - b.next.daysLeft)
      .slice(0, 4),
    activity,
    streak: computeStreak(streakDays.map((d) => d._id), tz),
    lastMonth: { key: shiftMonth(monthKey, -1), ...lastMonthAgg, previousExpense: prevMonthAgg.expense },
  });
});

function offsetString(tzOffset) {
  const mins = -Number(tzOffset || 0);
  const abs = Math.abs(mins);
  return `${mins >= 0 ? '+' : '-'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Income, spending and the top category for one month */
async function monthTotals(uid, { start, end }) {
  const [totals, cats] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]),
  ]);
  return {
    income: totals.find((t) => t._id === 'income')?.total || 0,
    expense: totals.find((t) => t._id === 'expense')?.total || 0,
    topCategory: cats[0] ? { category: cats[0]._id, total: cats[0].total } : null,
  };
}
