import { route } from '@/lib/api';
import { buildXlsx, XLSX_MIME } from '@/lib/xlsx';
import { methodLabel } from '@/lib/categories';
import User from '@/models/User';
import Task from '@/models/Task';
import List from '@/models/List';
import Reminder from '@/models/Reminder';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';
import Bill from '@/models/Bill';
import Goal from '@/models/Goal';

const PRIORITY = ['None', 'Low', 'Medium', 'High'];
const REPEAT = { none: 'Once', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** Download all of your data as an Excel workbook (one sheet per kind of data) */
export const GET = route(async (req, { userId }) => {
  const tz = Number(new URL(req.url).searchParams.get('tz'));
  const tzOffset = Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : -330; // default to IST

  const [user, lists, tasks, reminders, transactions, budgets, bills, goals] = await Promise.all([
    User.findById(userId).lean(),
    List.find({ $or: [{ owner: userId }, { 'members.user': userId }] }).lean(),
    Task.find({ owner: userId }).sort({ done: 1, dueDate: 1 }).lean(),
    Reminder.find({ user: userId }).sort({ remindAt: -1 }).lean(),
    Transaction.find({ user: userId }).sort({ date: -1 }).lean(),
    Budget.find({ user: userId }).sort({ category: 1 }).lean(),
    Bill.find({ user: userId }).sort({ dueDay: 1 }).lean(),
    Goal.find({ user: userId }).sort({ createdAt: 1 }).lean(),
  ]);
  const listName = new Map(lists.map((l) => [String(l._id), l.name]));
  const splits = transactions.filter((t) => t.split?.people?.length);
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const currency = user?.settings?.currency || 'INR';

  const sheets = [
    {
      name: 'Summary',
      columns: [
        { header: 'Item', width: 26 },
        { header: 'Value', width: 40 },
      ],
      rows: [
        ['Name', user?.name],
        ['Email', user?.email],
        ['Currency', currency],
        ['Exported on', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Tasks', tasks.length],
        ['Open tasks', tasks.filter((t) => !t.done).length],
        ['Reminders', reminders.length],
        ['Transactions', transactions.length],
        ['Total income (all time)', income.toFixed(2)],
        ['Total spent (all time)', expense.toFixed(2)],
        ['Split bills', splits.length],
      ],
    },
    {
      name: 'Tasks',
      columns: [
        { header: 'Title', width: 40 },
        { header: 'List', width: 18 },
        { header: 'Status', width: 10 },
        { header: 'Due', width: 22, type: 'datetime' },
        { header: 'Priority', width: 10 },
        { header: 'Repeat', width: 13 },
        { header: 'Reminder', width: 22, type: 'datetime' },
        { header: 'Tags', width: 18 },
        { header: 'Checklist', width: 40 },
        { header: 'Notes', width: 40 },
        { header: 'Completed on', width: 22, type: 'datetime' },
        { header: 'Created on', width: 22, type: 'datetime' },
      ],
      rows: tasks.map((t) => [
        t.title,
        t.list ? listName.get(String(t.list)) || '' : 'No list',
        t.done ? 'Done' : 'Open',
        t.dueDate,
        PRIORITY[t.priority || 0],
        REPEAT[t.repeat] || t.repeat,
        t.reminderAt,
        (t.tags || []).map((x) => `#${x}`).join(' '),
        (t.subtasks || []).map((s) => `${s.done ? '☑' : '☐'} ${s.title}`).join('  '),
        t.notes,
        t.completedAt,
        t.createdAt,
      ]),
    },
    {
      name: 'Reminders',
      columns: [
        { header: 'Title', width: 40 },
        { header: 'When', width: 22, type: 'datetime' },
        { header: 'Repeat', width: 13 },
        { header: 'Status', width: 10 },
        { header: 'Notification', width: 13, type: 'bool' },
        { header: 'Email', width: 9, type: 'bool' },
        { header: 'Note', width: 40 },
      ],
      rows: reminders.map((r) => [r.title, r.remindAt, REPEAT[r.repeat] || r.repeat, r.status === 'done' ? 'Done' : 'Scheduled', r.channels?.push, r.channels?.email, r.note]),
    },
    {
      name: 'Transactions',
      columns: [
        { header: 'Date', width: 14, type: 'date' },
        { header: 'Type', width: 10 },
        { header: 'Category', width: 22 },
        { header: `Amount (${currency})`, width: 15, type: 'money' },
        { header: 'Paid with', width: 14 },
        { header: 'Note', width: 34 },
        { header: 'Split total', width: 13, type: 'money' },
        { header: 'Paid by', width: 14 },
        { header: 'Split with', width: 34 },
      ],
      rows: transactions.map((t) => [
        t.date,
        t.type === 'income' ? 'Income' : 'Expense',
        t.category,
        t.amount,
        methodLabel(t.method),
        t.note,
        t.split?.total ?? '',
        t.split ? (t.split.paidBy === 'me' ? 'Me' : t.split.paidBy) : '',
        (t.split?.people || []).map((p) => `${p.name}: ${p.share}${p.settled ? ' (settled)' : ''}`).join(', '),
      ]),
    },
    {
      name: 'Split bills',
      columns: [
        { header: 'Date', width: 14, type: 'date' },
        { header: 'Bill', width: 30 },
        { header: 'Person', width: 18 },
        { header: 'Direction', width: 16 },
        { header: `Amount (${currency})`, width: 15, type: 'money' },
        { header: 'Settled', width: 9, type: 'bool' },
        { header: 'Bill total', width: 13, type: 'money' },
      ],
      rows: splits.flatMap((t) =>
        t.split.paidBy === 'me'
          ? t.split.people.map((p) => [t.date, t.note || t.category, p.name, 'Owes me', p.share, p.settled, t.split.total])
          : [[t.date, t.note || t.category, t.split.paidBy, 'I owe', t.amount, t.split.meSettled, t.split.total]]
      ),
    },
    {
      name: 'Budgets',
      columns: [
        { header: 'Category', width: 24 },
        { header: `Monthly limit (${currency})`, width: 20, type: 'money' },
      ],
      rows: budgets.map((b) => [b.category, b.limit]),
    },
    {
      name: 'Bills',
      columns: [
        { header: 'Name', width: 24 },
        { header: `Amount (${currency})`, width: 15, type: 'money' },
        { header: 'Category', width: 20 },
        { header: 'Repeats', width: 10 },
        { header: 'Due day', width: 9, type: 'number' },
        { header: 'Due month', width: 11 },
        { header: 'Remind (days before)', width: 20, type: 'number' },
        { header: 'Autopay', width: 9, type: 'bool' },
        { header: 'Active', width: 8, type: 'bool' },
      ],
      rows: bills.map((b) => [
        b.name,
        b.amount,
        b.category,
        cap(b.frequency),
        b.dueDay,
        b.frequency === 'yearly' ? new Date(2000, (b.dueMonth || 1) - 1, 1).toLocaleString('en-IN', { month: 'long' }) : '',
        b.remindDaysBefore,
        b.autopay,
        b.active,
      ]),
    },
    {
      name: 'Savings goals',
      columns: [
        { header: 'Goal', width: 26 },
        { header: `Target (${currency})`, width: 15, type: 'money' },
        { header: `Saved (${currency})`, width: 15, type: 'money' },
        { header: 'Progress', width: 11 },
        { header: 'Deadline', width: 14, type: 'date' },
        { header: 'Reached on', width: 14, type: 'date' },
      ],
      rows: goals.map((g) => [`${g.emoji || ''} ${g.name}`.trim(), g.target, g.saved, `${Math.min(100, Math.round((g.saved / g.target) * 100))}%`, g.deadline, g.reachedAt]),
    },
    {
      name: 'Lists',
      columns: [
        { header: 'Name', width: 24 },
        { header: 'Icon', width: 6 },
        { header: 'Shared', width: 9, type: 'bool' },
        { header: 'Members', width: 9, type: 'number' },
        { header: 'Created on', width: 14, type: 'date' },
      ],
      rows: lists.map((l) => [l.name, l.icon, Boolean(l.members?.length || l.shareEnabled), (l.members?.length || 0) + 1, l.createdAt]),
    },
  ];

  const bytes = buildXlsx(sheets, { tzOffset });
  return new Response(bytes, {
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="pockeazy-data-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
});
