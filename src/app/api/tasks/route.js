import { route, ok, readJson, HttpError, dateParam } from '@/lib/api';
import { taskCreateSchema } from '@/lib/validators';
import { requireList, taskScope } from '@/lib/access';
import { syncTaskReminder } from '@/lib/reminders';
import Task from '@/models/Task';

const POPULATE = [
  { path: 'list', select: 'name color icon' },
  { path: 'assignee', select: 'name image email' },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/tasks
 *   view      today | upcoming | overdue | all | completed | inbox   (default: all)
 *   list      list id
 *   q         search text (title, notes, tags)
 *   priority  0-3
 *   tag       tag name
 *   dayStart / dayEnd   ISO timestamps of the user's local "today" (sent by the client)
 */
export const GET = route(async (req, { userId }) => {
  const sp = new URL(req.url).searchParams;
  const view = sp.get('view') || 'all';
  const listId = sp.get('list');
  const q = sp.get('q')?.trim();
  const dayStart = dateParam(sp, 'dayStart', new Date(new Date().setHours(0, 0, 0, 0)));
  const dayEnd = dateParam(sp, 'dayEnd', new Date(dayStart.getTime() + 86400000));

  const filter = listId ? { list: (await requireList(listId, userId)).list._id } : await taskScope(userId);
  const and = [filter];

  switch (view) {
    case 'today':
      and.push({ done: false, dueDate: { $ne: null, $lt: dayEnd } });
      break;
    case 'upcoming':
      and.push({ done: false, dueDate: { $gte: dayEnd } });
      break;
    case 'overdue':
      and.push({ done: false, dueDate: { $ne: null, $lt: dayStart } });
      break;
    case 'completed':
      and.push({ done: true });
      break;
    case 'inbox':
      and.push({ owner: userId, list: null, done: false });
      break;
    default:
      if (sp.get('includeDone') !== '1') and.push({ done: false });
  }

  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ title: re }, { notes: re }, { tags: q.toLowerCase() }] });
  }
  if (sp.get('priority')) and.push({ priority: Number(sp.get('priority')) });
  if (sp.get('tag')) and.push({ tags: sp.get('tag').toLowerCase() });

  const tasks = await Task.find({ $and: and })
    .sort(view === 'completed' ? { completedAt: -1 } : { dueDate: 1, priority: -1, createdAt: -1 })
    .limit(view === 'completed' ? 100 : 500)
    .populate(POPULATE)
    .lean();

  return ok({ tasks });
});

export const POST = route(async (req, { userId }) => {
  const body = taskCreateSchema.parse(await readJson(req));
  if (body.list) await requireList(body.list, userId, 'editor');
  if (body.assignee && !body.list) throw new HttpError(400, 'Only tasks in shared lists can be assigned');

  const task = await Task.create({ ...body, owner: userId });
  await syncTaskReminder(task);
  const populated = await Task.findById(task._id).populate(POPULATE).lean();
  return ok({ task: populated }, 201);
});
