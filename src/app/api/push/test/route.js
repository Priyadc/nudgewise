import { route, ok, fail } from '@/lib/api';
import { sendPush } from '@/lib/notify';

export const POST = route(async (_req, { userId }) => {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return fail('Push is not configured (add VAPID keys to your env).', 503);
  }
  const sent = await sendPush(userId, {
    title: 'Nudgewise notifications are on 🎉',
    body: 'You will get reminders here, even when the app is closed.',
    url: '/reminders',
  });
  return ok({ sent });
});
