import mongoose from 'mongoose';
import List from '@/models/List';
import Task from '@/models/Task';
import { HttpError, assertId } from '@/lib/api';

const RANK = { viewer: 1, editor: 2, owner: 3 };

/** Returns the role a user has on a list: 'owner' | 'editor' | 'viewer' | null */
export function roleOnList(list, userId) {
  if (!list) return null;
  if (String(list.owner?._id || list.owner) === String(userId)) return 'owner';
  const m = list.members?.find((mm) => String(mm.user?._id || mm.user) === String(userId));
  return m ? m.role : null;
}

export async function requireList(listId, userId, need = 'viewer') {
  assertId(listId);
  const list = await List.findById(listId);
  if (!list) throw new HttpError(404, 'List not found');
  const role = roleOnList(list, userId);
  if (!role) throw new HttpError(404, 'List not found');
  if (RANK[role] < RANK[need]) throw new HttpError(403, 'You do not have permission to do that');
  return { list, role };
}

/** Ids of every list the user owns or is a member of */
export async function accessibleListIds(userId) {
  const lists = await List.find({ $or: [{ owner: userId }, { 'members.user': userId }] }).select('_id').lean();
  return lists.map((l) => l._id);
}

/** Filter that matches every task the user may see (ObjectIds, so it also works inside aggregations) */
export async function taskScope(userId) {
  const ids = await accessibleListIds(userId);
  return { $or: [{ owner: new mongoose.Types.ObjectId(String(userId)) }, { list: { $in: ids } }] };
}

export async function requireTask(taskId, userId, need = 'viewer') {
  assertId(taskId);
  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, 'Task not found');
  if (String(task.owner) === String(userId)) return { task, role: 'owner' };
  if (task.list) {
    const list = await List.findById(task.list);
    const role = roleOnList(list, userId);
    if (role && RANK[role] >= RANK[need]) return { task, role };
    if (role) throw new HttpError(403, 'You only have view access to this list');
  }
  throw new HttpError(404, 'Task not found');
}
