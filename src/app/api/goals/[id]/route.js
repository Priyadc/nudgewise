import { z } from 'zod';
import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { goalSchema } from '@/lib/validators';
import Goal from '@/models/Goal';

async function own(id, userId) {
  assertId(id);
  const g = await Goal.findOne({ _id: id, user: userId });
  if (!g) throw new HttpError(404, 'Goal not found');
  return g;
}

export const PATCH = route(async (req, { params, userId }) => {
  const goal = await own(params.id, userId);
  Object.assign(goal, goalSchema.partial().parse(await readJson(req)));
  goal.reachedAt = goal.saved >= goal.target ? goal.reachedAt || new Date() : null;
  await goal.save();
  return ok({ goal });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const goal = await own(params.id, userId);
  await goal.deleteOne();
  return ok({ deleted: true });
});

/** POST /api/goals/:id { action: 'add', amount } — put money in (negative = take some out) */
export const POST = route(async (req, { params, userId }) => {
  const goal = await own(params.id, userId);
  const { amount } = z.object({ action: z.literal('add'), amount: z.coerce.number().refine((v) => v !== 0 && Math.abs(v) <= 1e11) }).parse(await readJson(req));
  const wasReached = goal.saved >= goal.target;
  goal.saved = Math.max(0, Math.round((goal.saved + amount) * 100) / 100);
  goal.history.push({ amount, date: new Date() });
  if (goal.history.length > 100) goal.history = goal.history.slice(-100);
  const reached = goal.saved >= goal.target;
  goal.reachedAt = reached ? goal.reachedAt || new Date() : null;
  await goal.save();
  return ok({ goal, justReached: reached && !wasReached });
});
