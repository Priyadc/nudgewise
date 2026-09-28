import { z } from 'zod';
import { route, ok, readJson } from '@/lib/api';
import PushSubscription from '@/models/PushSubscription';

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export const POST = route(async (req, { userId }) => {
  const sub = subSchema.parse(await readJson(req));
  await PushSubscription.findOneAndUpdate(
    { endpoint: sub.endpoint },
    { $set: { user: userId, keys: sub.keys, userAgent: req.headers.get('user-agent')?.slice(0, 200) } },
    { upsert: true }
  );
  return ok({ subscribed: true }, 201);
});

export const DELETE = route(async (req, { userId }) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await readJson(req));
  await PushSubscription.deleteOne({ endpoint, user: userId });
  return ok({ unsubscribed: true });
});
