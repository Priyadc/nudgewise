import { route, ok, isId } from '@/lib/api';
import { processDueReminders } from '@/lib/reminders';
import Notification from '@/models/Notification';

/**
 * Polled by the app every ~45s.
 * Also delivers any due reminders for this user, so reminders work
 * even before the external scheduler is configured.
 */
export const GET = route(async (req, { userId }) => {
  await processDueReminders({ userId });
  const sinceRaw = new URL(req.url).searchParams.get('since');
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : null;
  const [items, unread, fresh] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: userId, read: false }),
    since
      ? Notification.find({ user: userId, createdAt: { $gt: new Date(since) } }).sort({ createdAt: 1 }).lean()
      : Promise.resolve([]),
  ]);
  return ok({ items, unread, fresh, now: new Date().toISOString() });
});

/** Mark all (or one) as read */
export const PATCH = route(async (req, { userId }) => {
  const id = new URL(req.url).searchParams.get('id');
  const filter = { user: userId, read: false };
  if (id && isId(id)) filter._id = id;
  await Notification.updateMany(filter, { read: true });
  return ok({ ok: true });
});

export const DELETE = route(async (_req, { userId }) => {
  await Notification.deleteMany({ user: userId });
  return ok({ ok: true });
});
