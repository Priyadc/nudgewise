import mongoose from 'mongoose';
import { route, ok } from '@/lib/api';
import Transaction from '@/models/Transaction';

/**
 * GET /api/transactions/memory
 * What you usually pick for a note ("swiggy" → Food & Dining, credit card),
 * so new entries can fill in the category and payment method for you.
 */
export const GET = route(async (_req, { userId }) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const rows = await Transaction.aggregate([
    { $match: { user: uid, note: { $nin: ['', null] } } },
    { $sort: { date: -1 } },
    { $limit: 800 },
    {
      $group: {
        _id: { key: { $toLower: { $trim: { input: '$note' } } }, type: '$type' },
        category: { $first: '$category' },
        method: { $first: '$method' },
        n: { $sum: 1 },
      },
    },
    { $sort: { n: -1 } },
    { $limit: 400 },
  ]);
  return ok({ memory: rows.map((r) => ({ key: r._id.key, type: r._id.type, category: r.category, method: r.method, n: r.n })) });
});
