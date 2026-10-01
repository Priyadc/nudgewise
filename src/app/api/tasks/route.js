import { route, ok, readJson, HttpError, dateParam } from '@/lib/api';
import { taskCreateSchema } from '@/lib/validators';
import { accessibleListIds, requireList, taskScope } from '@/lib/access';
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
      // Shopping lists also show items ticked during the current trip (?doneSince=<ISO>)
      if (sp.get('doneSince') !== null) {
        const since = dateParam(sp, 'doneSince', new Date(0));
        and.push({ $or: [{ done: false }, { done: true, completedAt: { $gte: since } }] });
      } else if (sp.get('includeDone') !== '1') and.push({ done: false });
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
  const target = body.list ? (await requireList(body.list, userId, 'editor')).list : null;
  if (body.assignee && !body.list) throw new HttpError(400, 'Only tasks in shared lists can be assigned');

  // Shopping lists remember what an item cost last time
  let priceRemembered = false;
  if (target?.kind === 'shopping' && (body.price === undefined || body.price === null)) {
    const last = await lastPrice(body.title, userId);
    if (last !== null) {
      body.price = last;
      priceRemembered = true;
    }
  }

  const task = await Task.create({ ...body, owner: userId });
  await syncTaskReminder(task);
  const populated = await Task.findById(task._id).populate(POPULATE).lean();
  return ok({ task: populated, priceRemembered }, 201);
});

/** Most recent price paid for an item with the same name, in any list the user can see */
async function lastPrice(title, userId) {
  const ids = await accessibleListIds(userId);
  const prev = await Task.findOne({
    list: { $in: ids },
    title: new RegExp(`^${escapeRegex(title.trim())}$`, 'i'),
    price: { $ne: null },
  })
    .sort({ updatedAt: -1 })
    .select('price')
    .lean();
  return prev ? prev.price : null;
}
