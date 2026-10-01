import { route, ok } from '@/lib/api';
import { buildCashCalendar } from '@/lib/money-plan';

/** GET /api/money/calendar?tz=-330&days=35 — expected balance for each upcoming day */
export const GET = route(async (req, { userId }) => {
  const sp = new URL(req.url).searchParams;
  const tz = Number(sp.get('tz') || 0);
  const days = Math.min(62, Math.max(7, Number(sp.get('days')) || 35));
  return ok(await buildCashCalendar(userId, tz, new Date(), days));
});
