import { route, ok, readJson } from '@/lib/api';
import { goalSchema } from '@/lib/validators';
import Goal from '@/models/Goal';

export const GET = route(async (_req, { userId }) => {
  const goals = await Goal.find({ user: userId }).sort({ reachedAt: 1, createdAt: -1 }).lean();
  return ok({ goals });
});

export const POST = route(async (req, { userId }) => {
  const body = goalSchema.parse(await readJson(req));
  const goal = await Goal.create({ ...body, user: userId });
  return ok({ goal }, 201);
});
