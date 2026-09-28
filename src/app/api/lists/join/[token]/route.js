import { route, ok, HttpError } from '@/lib/api';
import { deliver } from '@/lib/notify';
import List from '@/models/List';
import Task from '@/models/Task';
import User from '@/models/User';

async function findShared(token) {
  if (!token || token.length < 10) throw new HttpError(404, 'This link is not valid');
  const list = await List.findOne({ shareToken: token, shareEnabled: true }).populate('owner', 'name image');
  if (!list) throw new HttpError(404, 'This share link is invalid or has been turned off');
  return list;
}

/** Public preview of a shared list (no sign-in needed) */
export const GET = route(
  async (_req, { params }) => {
    const list = await findShared(params.token);
    const pending = await Task.countDocuments({ list: list._id, done: false });
    return ok({
      list: { name: list.name, icon: list.icon, color: list.color, owner: list.owner?.name, members: list.members.length + 1, pending, role: list.shareRole },
    });
  },
  { auth: false }
);

/** Join a shared list */
export const POST = route(async (_req, { params, userId }) => {
  const list = await findShared(params.token);
  const isOwner = String(list.owner._id) === String(userId);
  const already = list.members.some((m) => String(m.user) === String(userId));
  if (!isOwner && !already) {
    list.members.push({ user: userId, role: list.shareRole });
    await list.save();
    const me = await User.findById(userId).select('name email').lean();
    await deliver(
      list.owner._id,
      { title: `${me?.name || me?.email} joined "${list.name}"`, url: `/tasks?list=${list._id}`, type: 'share' },
      { inApp: true, push: true }
    );
  }
  return ok({ listId: list._id });
});
