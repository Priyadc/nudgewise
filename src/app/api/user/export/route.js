import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import User from '@/models/User';
import Task from '@/models/Task';
import List from '@/models/List';
import Reminder from '@/models/Reminder';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';
import Bill from '@/models/Bill';

/** Download all of your data as JSON (data portability) */
export const GET = route(async (_req, { userId }) => {
  const [user, lists, tasks, reminders, transactions, budgets, bills] = await Promise.all([
    User.findById(userId).lean(),
    List.find({ owner: userId }).lean(),
    Task.find({ owner: userId }).lean(),
    Reminder.find({ user: userId }).lean(),
    Transaction.find({ user: userId }).lean(),
    Budget.find({ user: userId }).lean(),
    Bill.find({ user: userId }).lean(),
  ]);
  delete user.password;
  const data = { exportedAt: new Date().toISOString(), user, lists, tasks, reminders, transactions, budgets, bills };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tickrupee-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
