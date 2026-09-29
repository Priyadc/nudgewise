import { route, ok } from '@/lib/api';
import { taskScope } from '@/lib/access';
import { computeStreak } from '@/lib/streak';
import Task from '@/models/Task';

/** GET /api/streak?tz=-330 — days in a row with at least one task finished */
export const GET = route(async (req, { userId }) => {
  const tz = Number(new URL(req.url).searchParams.get('tz') || 0);
  const scope = await taskScope(userId);
  const mins = -tz;
  const abs = Math.abs(mins);
  const timezone = `${mins >= 0 ? '+' : '-'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  const days = await Task.aggregate([
    { $match: { $and: [scope, { completedAt: { $gte: new Date(Date.now() - 120 * 86400000) } }] } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone } } } },
  ]);
  return ok(computeStreak(days.map((d) => d._id), tz));
});
