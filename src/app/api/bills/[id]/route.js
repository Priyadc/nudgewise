import { z } from 'zod';
import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { billSchema } from '@/lib/validators';
import { nextBillDue } from '@/lib/recurrence';
import Bill from '@/models/Bill';
import Transaction, { PAYMENT_METHOD_VALUES } from '@/models/Transaction';
import { payBill } from '@/lib/bills-server';

async function own(id, userId) {
  assertId(id);
  const b = await Bill.findOne({ _id: id, user: userId });
  if (!b) throw new HttpError(404, 'Bill not found');
  return b;
}

export const PATCH = route(async (req, { params, userId }) => {
  const bill = await own(params.id, userId);
  Object.assign(bill, billSchema.partial().parse(await readJson(req)));
  await bill.save();
  return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) } });
});

export const DELETE = route(async (_req, { params, userId }) => {
  const bill = await own(params.id, userId);
  await bill.deleteOne();
  return ok({ deleted: true });
});

/**
 * POST /api/bills/:id  { action: 'pay', amount?, method? }
 * Marks the current period as paid and records an expense transaction.
 * { action: 'unpay', period } reverts it.
 */
export const POST = route(async (req, { params, userId }) => {
  const bill = await own(params.id, userId);
  const body = z
    .object({
      action: z.enum(['pay', 'unpay']),
      amount: z.coerce.number().min(0).optional(),
      method: z.enum(PAYMENT_METHOD_VALUES).optional(),
      period: z.string().max(7).optional(),
    })
    .parse(await readJson(req));

  if (body.action === 'unpay') {
    bill.paidPeriods = bill.paidPeriods.filter((p) => p !== body.period);
    await bill.save();
    await Transaction.deleteMany({ bill: bill._id, note: `${bill.name} · ${body.period}` });
    return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) } });
  }

  const { transaction, paidPeriod } = await payBill(bill, { amount: body.amount, method: body.method });
  return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) }, transaction, paidPeriod });
});
