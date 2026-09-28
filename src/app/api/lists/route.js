import { route, ok, readJson } from '@/lib/api';
import { listSchema } from '@/lib/validators';
import { serializeList } from '@/lib/serializers';
import List from '@/models/List';
import Task from '@/models/Task';

export const GET = route(async (_req, { userId }) => {
  const lists = await List.find({ $or: [{ owner: userId }, { 'members.user': userId }] })
    .sort({ createdAt: 1 })
    .populate('owner', 'name email image')
    .populate('members.user', 'name email image')
    .lean();

  const counts = await Task.aggregate([
    { $match: { list: { $in: lists.map((l) => l._id) }, done: false } },
    { $group: { _id: '$list', n: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

  return ok({ lists: lists.map((l) => serializeList(l, userId, byId[String(l._id)] || 0)) });
});

export const POST = route(async (req, { userId }) => {
  const body = listSchema.parse(await readJson(req));
  const list = await List.create({ ...body, owner: userId });
  await list.populate('owner', 'name email image');
  return ok({ list: serializeList(list, userId) }, 201);
});
