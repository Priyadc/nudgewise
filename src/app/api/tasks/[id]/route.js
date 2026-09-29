import { route, ok, readJson, HttpError } from '@/lib/api';
import { taskUpdateSchema } from '@/lib/validators';
import { requireTask, requireList, roleOnList } from '@/lib/access';
import { syncTaskReminder } from '@/lib/reminders';
import { nextOccurrence } from '@/lib/recurrence';
import Task from '@/models/Task';
import Reminder from '@/models/Reminder';

const POPULATE = [
  { path: 'list', select: 'name color icon' },
  { path: 'assignee', select: 'name image email' },
];

export const GET = route(async (_req, { params, userId }) => {
  const { task, role } = await requireTask(params.id, userId);
  await task.populate(POPULATE);
  return ok({ task, role });
});

export const PATCH = route(async (req, { params, userId }) => {
  const { task } = await requireTask(params.id, userId, 'editor');
  const body = taskUpdateSchema.parse(await readJson(req));
  if (body.list && String(body.list) !== String(task.list)) await requireList(body.list, userId, 'editor');

  // Only people on the task's list can be assigned
  if (body.assignee) {
    const listId = body.list !== undefined ? body.list : task.list;
    if (!listId) throw new HttpError(400, 'Only tasks in shared lists can be assigned');
    const { list } = await requireList(listId, userId);
    if (!roleOnList(list, body.assignee)) throw new HttpError(400, 'That person is not a member of this list');
  }

  let rescheduled = false;
  // Completing a recurring task rolls it forward instead of closing it (like Todoist)
  if (body.done === true && !task.done && task.repeat !== 'none' && task.dueDate) {
    const shift = nextOccurrence(task.dueDate, task.repeat) - new Date(task.dueDate);
    body.dueDate = nextOccurrence(task.dueDate, task.repeat);
    if (task.reminderAt) body.reminderAt = new Date(new Date(task.reminderAt).getTime() + shift);
    body.subtasks = task.subtasks.map((s) => ({ title: s.title, done: false }));
    delete body.done;
    rescheduled = true;
  }

  Object.assign(task, body);
  // Rolled-forward recurring tasks still count as "completed today" for streaks
  if (body.done === true || rescheduled) task.completedAt = new Date();
  if (body.done === false) task.completedAt = null;
  await task.save();
  await syncTaskReminder(task);
  await task.populate(POPULATE);
  return ok({ task, rescheduled });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const { task } = await requireTask(params.id, userId, 'editor');
  await Reminder.deleteMany({ task: task._id });
  await task.deleteOne();
  return ok({ deleted: true });
});
