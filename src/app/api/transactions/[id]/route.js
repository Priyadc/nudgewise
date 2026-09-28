import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { transactionSchema } from '@/lib/validators';
import { destroyImages } from '@/lib/cloudinary';
import Transaction from '@/models/Transaction';

async function own(id, userId) {
  assertId(id);
  const t = await Transaction.findOne({ _id: id, user: userId });
  if (!t) throw new HttpError(404, 'Transaction not found');
  return t;
}

export const PATCH = route(async (req, { params, userId }) => {
  const t = await own(params.id, userId);
  const body = transactionSchema.partial().parse(await readJson(req));
  if ('receipt' in body && t.receipt?.publicId && body.receipt?.publicId !== t.receipt.publicId) {
    destroyImages([t.receipt.publicId]);
  }
  Object.assign(t, body);
  await t.save();
  return ok({ transaction: t });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const t = await own(params.id, userId);
  if (t.receipt?.publicId) destroyImages([t.receipt.publicId]);
  await t.deleteOne();
  return ok({ deleted: true });
});
