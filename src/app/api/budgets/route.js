import { route, ok, readJson } from '@/lib/api';
import { budgetSchema } from '@/lib/validators';
import Budget from '@/models/Budget';

export const GET = route(async (_req, { userId }) => {
  const budgets = await Budget.find({ user: userId }).sort({ category: 1 }).lean();
  return ok({ budgets });
});

/** Create or update the monthly budget for a category */
export const PUT = route(async (req, { userId }) => {
  const { category, limit } = budgetSchema.parse(await readJson(req));
  const budget = await Budget.findOneAndUpdate(
    { user: userId, category },
    { $set: { limit } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return ok({ budget });
});

export const DELETE = route(async (req, { userId }) => {
  const category = new URL(req.url).searchParams.get('category');
  await Budget.deleteOne({ user: userId, category });
  return ok({ deleted: true });
});
