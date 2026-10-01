import { route, ok } from '@/lib/api';
import { buildMoneyPlan, buildNoSpend } from '@/lib/money-plan';

/** GET /api/money/plan?tz=-330 — safe-to-spend today, bills left this month, savings plan, no-spend streak */
export const GET = route(async (req, { userId }) => {
  const tz = Number(new URL(req.url).searchParams.get('tz') || 0);
  const [plan, noSpend] = await Promise.all([buildMoneyPlan(userId, tz), buildNoSpend(userId, tz)]);
  return ok({ plan, noSpend });
});
