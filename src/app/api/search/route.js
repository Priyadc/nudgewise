import { route, ok } from '@/lib/api';
import { taskScope } from '@/lib/access';
import Task from '@/models/Task';
import Reminder from '@/models/Reminder';
import Transaction from '@/models/Transaction';
import Goal from '@/models/Goal';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /api/search?q= — tasks, reminders, money entries and goals in one go */
export const GET = route(async (req, { userId }) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return ok({ tasks: [], reminders: [], transactions: [], goals: [] });
  const rx = new RegExp(escape(q), 'i');
  const scope = await taskScope(userId);
  const [tasks, reminders, transactions, goals] = await Promise.all([
    Task.find({ $and: [scope, { $or: [{ title: rx }, { notes: rx }, { tags: rx }] }] })
      .sort({ done: 1, dueDate: 1 })
      .limit(8)
      .populate('list', 'name icon color')
      .select('title done dueDate hasTime list priority')
      .lean(),
    Reminder.find({ user: userId, task: null, $or: [{ title: rx }, { note: rx }] })
      .sort({ remindAt: -1 })
      .limit(5)
      .select('title note remindAt status repeat channels')
      .lean(),
    Transaction.find({ user: userId, $or: [{ note: rx }, { category: rx }, { 'split.people.name': rx }] })
      .sort({ date: -1 })
      .limit(8)
      .lean(),
    Goal.find({ user: userId, name: rx }).limit(4).lean(),
  ]);
  return ok({ tasks, reminders, transactions, goals });
});
