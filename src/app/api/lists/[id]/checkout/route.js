import { z } from 'zod';
import { route, ok, readJson, HttpError } from '@/lib/api';
import { requireList } from '@/lib/access';
import Task from '@/models/Task';
import Transaction from '@/models/Transaction';

/**
 * POST /api/lists/:id/checkout { logExpense: true }
 * Finishes a shopping trip: adds up the ticked items, optionally logs the total
 * as a Groceries expense, and starts a fresh cart.
 */
export const POST = route(async (req, { params, userId }) => {
  const { list } = await requireList(params.id, userId, 'editor');
  if (list.kind !== 'shopping') throw new HttpError(400, 'This is not a shopping list');
  const { logExpense, category } = z
    .object({ logExpense: z.boolean().default(true), category: z.string().trim().min(1).max(40).default('Groceries') })
    .parse(await readJson(req));

  const since = list.tripStartedAt || new Date(0);
  const items = await Task.find({ list: list._id, done: true, completedAt: { $gte: since } }).select('title price').lean();
  const total = Math.round(items.reduce((s, t) => s + (t.price || 0), 0) * 100) / 100;

  let transaction = null;
  if (logExpense && total > 0) {
    const names = items.map((t) => t.title);
    const note = `${list.name}: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` +${names.length - 6} more` : ''}`.slice(0, 300);
    transaction = await Transaction.create({ user: userId, type: 'expense', amount: total, category, note, method: 'upi', date: new Date() });
  }

  list.tripStartedAt = new Date();
  await list.save();
  return ok({ total, count: items.length, priced: items.filter((t) => t.price !== null && t.price !== undefined).length, transaction, tripStartedAt: list.tripStartedAt });
});
