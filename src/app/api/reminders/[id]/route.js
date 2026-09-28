import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { reminderUpdateSchema } from '@/lib/validators';
import Reminder from '@/models/Reminder';
import Task from '@/models/Task';

async function own(id, userId) {
  assertId(id);
  const r = await Reminder.findOne({ _id: id, user: userId });
  if (!r) throw new HttpError(404, 'Reminder not found');
  return r;
}

export const PATCH = route(async (req, { params, userId }) => {
  const r = await own(params.id, userId);
  const body = reminderUpdateSchema.parse(await readJson(req));
  if (body.channels) body.channels = { ...(r.toObject().channels || {}), ...body.channels };
  Object.assign(r, body);
  // Rescheduling (edit or snooze) re-arms the reminder
  if (body.remindAt) r.pending = body.remindAt > new Date();
  if (body.status === 'done') r.pending = false;
  if (body.status === 'active' && r.remindAt > new Date()) r.pending = true;
  await r.save();

  // Keep the linked task in step
  if (r.task && body.remindAt) await Task.updateOne({ _id: r.task }, { reminderAt: r.remindAt });
  return ok({ reminder: r });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const r = await own(params.id, userId);
  if (r.task) await Task.updateOne({ _id: r.task }, { reminderAt: null });
  await r.deleteOne();
  return ok({ deleted: true });
});
