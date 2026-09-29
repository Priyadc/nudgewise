import { route, ok, readJson } from '@/lib/api';
import { PAYMENT_METHOD_VALUES } from '@/models/Transaction';
import { normalizeSplit } from '@/lib/splits-server';
import { transactionSchema } from '@/lib/validators';
import { monthBounds, isMonthKey, currentMonthKey } from '@/lib/months';
import Transaction from '@/models/Transaction';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** GET /api/transactions?month=2026-09&tz=-330&type=expense&category=Food&q=swiggy */
export const GET = route(async (req, { userId }) => {
  const sp = new URL(req.url).searchParams;
  const tz = sp.get('tz') || 0;
  const month = isMonthKey(sp.get('month')) ? sp.get('month') : currentMonthKey(tz);
  const filter = { user: userId };
  if (sp.get('all') !== '1') {
    const { start, end } = monthBounds(month, tz);
    filter.date = { $gte: start, $lt: end };
  }
  if (['income', 'expense'].includes(sp.get('type'))) filter.type = sp.get('type');
  if (sp.get('category')) filter.category = sp.get('category');
  if (PAYMENT_METHOD_VALUES.includes(sp.get('method'))) filter.method = sp.get('method');
  if (sp.get('split') === '1') filter.split = { $ne: null };
  if (sp.get('q')) {
    const re = new RegExp(escapeRegex(sp.get('q').trim()), 'i');
    filter.$or = [{ note: re }, { category: re }];
  }
  const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).lean();
  return ok({ transactions, month });
});

export const POST = route(async (req, { userId }) => {
  const body = normalizeSplit(transactionSchema.parse(await readJson(req)));
  const transaction = await Transaction.create({ ...body, date: body.date || new Date(), user: userId });
  return ok({ transaction }, 201);
});

