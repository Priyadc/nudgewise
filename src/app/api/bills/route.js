import { route, ok, readJson } from '@/lib/api';
import { billSchema } from '@/lib/validators';
import { nextBillDue } from '@/lib/recurrence';
import Bill from '@/models/Bill';

export const GET = route(async (_req, { userId }) => {
  const bills = await Bill.find({ user: userId }).lean();
  const now = new Date();
  const withDue = bills
    .map((b) => ({ ...b, next: nextBillDue(b, now) }))
    .sort((a, b) => new Date(a.next.dueDate) - new Date(b.next.dueDate));
  return ok({ bills: withDue });
});

export const POST = route(async (req, { userId }) => {
  const body = billSchema.parse(await readJson(req));
  const bill = await Bill.create({ ...body, user: userId });
  return ok({ bill: { ...bill.toObject(), next: nextBillDue(bill) } }, 201);
});
