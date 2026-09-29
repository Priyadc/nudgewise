import Reminder from '@/models/Reminder';
import Bill from '@/models/Bill';
import Transaction from '@/models/Transaction';
import { deliver } from '@/lib/notify';
import { nextFutureOccurrence, nextBillDue } from '@/lib/recurrence';

/**
 * Keeps the Reminder linked to a task in sync with task.reminderAt.
 * Called after every task create/update.
 */
export async function syncTaskReminder(task) {
  if (!task.reminderAt || task.done) {
    await Reminder.deleteMany({ task: task._id });
    return;
  }
  await Reminder.findOneAndUpdate(
    { task: task._id },
    {
      $set: {
        user: task.owner,
        title: task.title,
        note: task.dueDate ? 'Task due soon' : 'Task reminder',
        remindAt: task.reminderAt,
        repeat: 'none',
        status: 'active',
        // Only future reminders are scheduled; a past time is saved but never fired
        pending: task.reminderAt > new Date(),
        channels: { inApp: true, push: true, email: true },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Sends every reminder that is due.
 * - Called every minute by an external scheduler via /api/cron/reminders (all users)
 * - Also called lazily when a user's app polls notifications (that user only),
 *   so in-app reminders work even before the scheduler is set up.
 * Each reminder is "claimed" atomically, so two callers never send it twice.
 */
export async function processDueReminders({ userId } = {}) {
  const now = new Date();
  const query = { status: 'active', pending: true, remindAt: { $lte: now } };
  if (userId) query.user = userId;

  const due = await Reminder.find(query).sort({ remindAt: 1 }).limit(100).lean();
  let sent = 0;

  for (const r of due) {
    const claimed = await Reminder.findOneAndUpdate(
      { _id: r._id, pending: true, remindAt: r.remindAt },
      { $set: { pending: false, lastSentAt: now } },
      { new: true }
    );
    if (!claimed) continue;

    await deliver(
      r.user,
      {
        title: r.title,
        body: r.note || 'Reminder',
        url: r.task ? `/tasks?task=${r.task}` : '/reminders',
        type: 'reminder',
        // Buttons on the phone notification (handled in public/sw.js → /api/quick-action)
        actions: [
          { action: 'done', title: '✓ Done' },
          { action: 'snooze', title: '⏰ In 1 hour' },
        ],
        meta: { kind: 'reminder', id: String(r._id) },
      },
      r.channels || {}
    );
    sent += 1;

    if (r.repeat && r.repeat !== 'none') {
      const next = nextFutureOccurrence(r.remindAt, r.repeat, now);
      if (next) await Reminder.updateOne({ _id: r._id }, { $set: { remindAt: next, pending: true } });
    }
  }

  const bills = await processBillAlerts({ userId, now });
  const autopaid = await processAutopay({ userId, now });
  return { reminders: sent, bills, autopaid };
}

/** Sends a one-time alert for each unpaid bill that enters its reminder window */
export async function processBillAlerts({ userId, now = new Date() } = {}) {
  const q = { active: true, autopay: { $ne: true } };
  if (userId) q.user = userId;
  const bills = await Bill.find(q).limit(500).lean();
  let sent = 0;

  for (const bill of bills) {
    const due = nextBillDue(bill, now);
    const inWindow = due.daysLeft <= (bill.remindDaysBefore ?? 2);
    if (!inWindow || (bill.notifiedPeriods || []).includes(due.period)) continue;

    const claimed = await Bill.findOneAndUpdate(
      { _id: bill._id, notifiedPeriods: { $ne: due.period } },
      { $push: { notifiedPeriods: { $each: [due.period], $slice: -24 } } }
    );
    if (!claimed) continue;

    const when =
      due.daysLeft < 0 ? `was due ${Math.abs(due.daysLeft)} day(s) ago` : due.daysLeft === 0 ? 'is due today' : `is due in ${due.daysLeft} day(s)`;
    await deliver(
      bill.user,
      {
        title: `${bill.name} ${when}`,
        body: `Amount: ${bill.amount}`,
        url: '/finance?tab=bills',
        type: 'bill',
        actions: [{ action: 'paid', title: '✓ Mark as paid' }],
        meta: { kind: 'bill', id: String(bill._id) },
      },
      { inApp: true, push: true, email: true }
    );
    sent += 1;
  }
  return sent;
}

/** Autopay bills are logged as expenses automatically on their due date */
export async function processAutopay({ userId, now = new Date() } = {}) {
  const q = { active: true, autopay: true };
  if (userId) q.user = userId;
  const bills = await Bill.find(q).limit(500);
  let logged = 0;
  for (const bill of bills) {
    const due = nextBillDue(bill, now);
    if (due.daysLeft > 0 || bill.paidPeriods.includes(due.period)) continue;
    // Claim the period atomically so two schedulers never log it twice
    const claimed = await Bill.findOneAndUpdate(
      { _id: bill._id, paidPeriods: { $ne: due.period } },
      { $push: { paidPeriods: { $each: [due.period], $slice: -36 } } }
    );
    if (!claimed) continue;
    await Transaction.create({
      user: bill.user,
      type: 'expense',
      amount: bill.amount,
      category: bill.category || 'Bills & Utilities',
      note: `${bill.name} · ${due.period}`,
      method: 'bank',
      date: now,
      bill: bill._id,
    });
    logged += 1;
    await deliver(
      bill.user,
      { title: `${bill.name} logged automatically`, body: `Autopay · ${bill.amount} added to your expenses`, url: '/finance', type: 'bill' },
      { inApp: true, push: false, email: false }
    );
  }
  return logged;
}
