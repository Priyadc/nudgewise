import { route, ok, readJson } from '@/lib/api';
import { reminderSchema } from '@/lib/validators';
import Reminder from '@/models/Reminder';

export const GET = route(async (req, { userId }) => {
  const status = new URL(req.url).searchParams.get('status');
  const filter = { user: userId };
  if (status) filter.status = status;
  const reminders = await Reminder.find(filter).sort({ remindAt: 1 }).limit(300).lean();
  return ok({ reminders });
});

export const POST = route(async (req, { userId }) => {
  const body = reminderSchema.parse(await readJson(req));
  const reminder = await Reminder.create({
    ...body,
    user: userId,
    pending: body.remindAt > new Date(),
    channels: { inApp: true, push: true, email: false, ...(body.channels || {}) },
  });
  return ok({ reminder }, 201);
});
