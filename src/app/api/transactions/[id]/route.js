import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { transactionSchema } from '@/lib/validators';
import Transaction from '@/models/Transaction';
import { normalizeSplit } from '@/lib/splits-server';

async function own(id, userId) {
  assertId(id);
  const t = await Transaction.findOne({ _id: id, user: userId });
  if (!t) throw new HttpError(404, 'Transaction not found');
  return t;
}

export const PATCH = route(async (req, { params, userId }) => {
  const t = await own(params.id, userId);
  const body = normalizeSplit(transactionSchema.partial().parse(await readJson(req)), t.type);
  Object.assign(t, body);
  await t.save();
  return ok({ transaction: t });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const t = await own(params.id, userId);
  await t.deleteOne();
  return ok({ deleted: true });
});
