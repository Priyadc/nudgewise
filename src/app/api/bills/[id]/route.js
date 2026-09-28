import { z } from 'zod';
import { route, ok, readJson, assertId, HttpError } from '@/lib/api';
import { billSchema } from '@/lib/validators';
import { nextBillDue } from '@/lib/recurrence';
import Bill from '@/models/Bill';
import Transaction from '@/models/Transaction';

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
      method: z.enum(['upi', 'card', 'cash', 'bank', 'other']).optional(),
      period: z.string().max(7).optional(),
    })
    .parse(await readJson(req));

  if (body.action === 'unpay') {
    bill.paidPeriods = bill.paidPeriods.filter((p) => p !== body.period);
    await bill.save();
    await Transaction.deleteMany({ bill: bill._id, note: `${bill.name} · ${body.period}` });
    return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) } });
  }

  const due = nextBillDue(bill);
  if (!bill.paidPeriods.includes(due.period)) bill.paidPeriods.push(due.period);
  if (bill.paidPeriods.length > 36) bill.paidPeriods = bill.paidPeriods.slice(-36);
  await bill.save();

  const transaction = await Transaction.create({
    user: userId,
    type: 'expense',
    amount: body.amount ?? bill.amount,
    category: bill.category || 'Bills & Utilities',
    note: `${bill.name} · ${due.period}`,
    method: body.method || 'upi',
    date: new Date(),
    bill: bill._id,
  });

  return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) }, transaction, paidPeriod: due.period });
});
