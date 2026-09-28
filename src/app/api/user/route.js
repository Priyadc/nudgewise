import { route, ok, readJson } from '@/lib/api';
import { settingsSchema } from '@/lib/validators';
import { destroyImages, userFolder } from '@/lib/cloudinary';
import User from '@/models/User';
import Task from '@/models/Task';
import List from '@/models/List';
import Reminder from '@/models/Reminder';
import Transaction from '@/models/Transaction';
import Budget from '@/models/Budget';
import Bill from '@/models/Bill';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';

export const GET = route(async (_req, { userId }) => {
  const user = await User.findById(userId);
  return ok({ user, features: { google: Boolean(process.env.GOOGLE_CLIENT_ID), push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), uploads: Boolean(process.env.CLOUDINARY_CLOUD_NAME) } });
});

export const PATCH = route(async (req, { userId }) => {
  const body = settingsSchema.parse(await readJson(req));
  const user = await User.findById(userId);
  if (body.name) user.name = body.name;
  if (body.image !== undefined) {
    if (user.image?.includes(`/${userFolder(userId)}/`) && user.image !== body.image) {
      const publicId = user.image.split('/upload/')[1]?.replace(/^v\d+\//, '').replace(/\.[a-z]+$/i, '');
      if (publicId) destroyImages([publicId]);
    }
    user.image = body.image;
  }
  if (body.settings) user.settings = { ...user.toObject().settings, ...body.settings };
  await user.save();
  return ok({ user });
});

/** Permanently deletes the account and everything in it */
export const DELETE = route(async (_req, { userId }) => {
  const ownedLists = await List.find({ owner: userId }).distinct('_id');
  await Promise.all([
    Task.deleteMany({ $or: [{ owner: userId }, { list: { $in: ownedLists } }] }),
    List.deleteMany({ owner: userId }),
    List.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } }),
    Reminder.deleteMany({ user: userId }),
    Transaction.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    Bill.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    PushSubscription.deleteMany({ user: userId }),
  ]);
  await User.deleteOne({ _id: userId });
  return ok({ deleted: true });
});
