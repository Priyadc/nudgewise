import { z } from 'zod';
import { route, ok, readJson, HttpError } from '@/lib/api';
import { computeBalances, settleWith } from '@/lib/splits';
import Transaction from '@/models/Transaction';

async function splitTransactions(userId) {
  return Transaction.find({ user: userId, split: { $ne: null } }).sort({ date: -1 }).limit(2000);
}

/** GET /api/splits — who owes me, who I owe, and the bills behind it */
export const GET = route(async (_req, { userId }) => {
  const txns = await splitTransactions(userId);
  return ok(computeBalances(txns.map((t) => t.toObject())));
});

/** POST /api/splits { action: 'settle', name } — mark everything with that person as paid back */
export const POST = route(async (req, { userId }) => {
  const { name } = z.object({ action: z.literal('settle'), name: z.string().trim().min(1).max(40) }).parse(await readJson(req));
  const txns = await splitTransactions(userId);
  const changed = settleWith(txns, name);
  if (!changed.length) throw new HttpError(404, `Nothing to settle with ${name}`);
  await Promise.all(changed.map((t) => { t.markModified('split'); return t.save(); }));
  const fresh = await splitTransactions(userId);
  return ok({ settled: changed.length, ...computeBalances(fresh.map((t) => t.toObject())) });
});
