import { roleOnList } from '@/lib/access';

/** Shapes a list for the client and hides share secrets from non-owners */
export function serializeList(list, userId, pending = 0) {
  const role = roleOnList(list, userId);
  const obj = typeof list.toObject === 'function' ? list.toObject() : list;
  return {
    _id: obj._id,
    name: obj.name,
    color: obj.color,
    icon: obj.icon,
    owner: obj.owner,
    members: obj.members,
    role,
    shared: (obj.members?.length || 0) > 0,
    pending,
    ...(role === 'owner' ? { shareEnabled: obj.shareEnabled, shareToken: obj.shareToken, shareRole: obj.shareRole } : {}),
  };
}
