import { route, ok, readJson, HttpError } from '@/lib/api';
import { listSchema } from '@/lib/validators';
import { requireList } from '@/lib/access';
import { serializeList } from '@/lib/serializers';
import Task from '@/models/Task';
import Reminder from '@/models/Reminder';

export const GET = route(async (_req, { params, userId }) => {
  const { list } = await requireList(params.id, userId);
  await list.populate([
    { path: 'owner', select: 'name email image' },
    { path: 'members.user', select: 'name email image' },
  ]);
  const pending = await Task.countDocuments({ list: list._id, done: false });
  return ok({ list: serializeList(list, userId, pending) });
});

export const PATCH = route(async (req, { params, userId }) => {
  const { list } = await requireList(params.id, userId, 'editor');
  const body = listSchema.partial().parse(await readJson(req));
  Object.assign(list, body);
  await list.save();
  return ok({ list: serializeList(list, userId) });
});

/** Owner deletes the list (and its tasks). A member calling DELETE leaves the list instead. */
export const DELETE = route(async (_req, { params, userId }) => {
  const { list, role } = await requireList(params.id, userId);
  if (role !== 'owner') {
    list.members = list.members.filter((m) => String(m.user) !== String(userId));
    await list.save();
    return ok({ left: true });
  }
  const taskIds = await Task.find({ list: list._id }).distinct('_id');
  if (taskIds.length > 5000) throw new HttpError(400, 'List is too large to delete at once');
  await Reminder.deleteMany({ task: { $in: taskIds } });
  await Task.deleteMany({ list: list._id });
  await list.deleteOne();
  return ok({ deleted: true });
});
