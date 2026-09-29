import { z } from 'zod';
import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { syncTaskReminder } from '@/lib/reminders';
import { nextOccurrence } from '@/lib/recurrence';
import { payBill } from '@/lib/bills-server';
import Reminder from '@/models/Reminder';
import Task from '@/models/Task';
import Bill from '@/models/Bill';

const schema = z.object({
  kind: z.enum(['reminder', 'bill']),
  id: z.string(),
  action: z.enum(['done', 'snooze', 'paid']),
  minutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
});

/** Marks a task done, rolling recurring tasks forward (same rule as PATCH /api/tasks/:id) */
async function completeTask(task) {
  if (task.repeat !== 'none' && task.dueDate) {
    const next = nextOccurrence(task.dueDate, task.repeat);
    const shift = next - new Date(task.dueDate);
    task.dueDate = next;
    if (task.reminderAt) task.reminderAt = new Date(new Date(task.reminderAt).getTime() + shift);
    task.subtasks = task.subtasks.map((s) => ({ title: s.title, done: false }));
    task.completedAt = new Date();
  } else {
    task.done = true;
    task.completedAt = new Date();
  }
  await task.save();
  await syncTaskReminder(task);
}

/**
 * POST /api/quick-action — the buttons on a phone notification.
 *   { kind: 'reminder', id, action: 'done' | 'snooze', minutes? }
 *   { kind: 'bill', id, action: 'paid' }
 * Called by the service worker with the user's session cookie.
 */
export const POST = route(async (req, { userId }) => {
  const body = schema.parse(await readJson(req));
  assertId(body.id);

  if (body.kind === 'bill') {
    if (body.action !== 'paid') throw new HttpError(400, 'Unknown action');
    const bill = await Bill.findOne({ _id: body.id, user: userId });
    if (!bill) throw new HttpError(404, 'Bill not found');
    const res = await payBill(bill);
    return ok({ message: res.already ? `${bill.name} was already paid` : `${bill.name} marked as paid` });
  }

  const r = await Reminder.findOne({ _id: body.id, user: userId });
  if (!r) throw new HttpError(404, 'Reminder not found');

  if (body.action === 'snooze') {
    const at = new Date(Date.now() + (body.minutes || 60) * 60000);
    r.remindAt = at;
    r.status = 'active';
    r.pending = true;
    await r.save();
    if (r.task) await Task.updateOne({ _id: r.task }, { reminderAt: at });
    return ok({ message: `Snoozed — we'll remind you again at ${at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` });
  }

  // done
  if (r.task) {
    const task = await Task.findById(r.task);
    if (task && !task.done) await completeTask(task);
  }
  if (!r.repeat || r.repeat === 'none') {
    r.status = 'done';
    r.pending = false;
    await r.save();
  }
  return ok({ message: `Done: ${r.title} ✓` });
});
