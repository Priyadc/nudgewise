import crypto from 'crypto';
import { z } from 'zod';
import { route, ok, readJson, HttpError } from '@/lib/api';
import { requireList } from '@/lib/access';
import { serializeList } from '@/lib/serializers';
import { deliver, sendEmail, appUrl } from '@/lib/notify';
import User from '@/models/User';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enable'), role: z.enum(['viewer', 'editor']).optional() }),
  z.object({ action: z.literal('disable') }),
  z.object({ action: z.literal('regenerate') }),
  z.object({ action: z.literal('invite'), email: z.string().trim().toLowerCase().email(), role: z.enum(['viewer', 'editor']).optional() }),
  z.object({ action: z.literal('remove'), userId: z.string() }),
  z.object({ action: z.literal('role'), userId: z.string(), role: z.enum(['viewer', 'editor']) }),
]);

const newToken = () => crypto.randomBytes(18).toString('base64url');

/** Sharing controls — owner only */
export const POST = route(async (req, { params, userId }) => {
  const { list } = await requireList(params.id, userId, 'owner');
  const body = schema.parse(await readJson(req));
  const me = await User.findById(userId).lean();

  switch (body.action) {
    case 'enable':
      if (!list.shareToken) list.shareToken = newToken();
      list.shareEnabled = true;
      if (body.role) list.shareRole = body.role;
      break;
    case 'disable':
      list.shareEnabled = false;
      break;
    case 'regenerate':
      list.shareToken = newToken();
      list.shareEnabled = true;
      break;
    case 'invite': {
      if (body.email === me.email) throw new HttpError(400, 'You already own this list');
      if (!list.shareToken) list.shareToken = newToken();
      list.shareEnabled = true;
      const link = `${appUrl()}/share/${list.shareToken}`;
      const invitee = await User.findOne({ email: body.email }).lean();
      if (invitee) {
        if (!list.members.some((m) => String(m.user) === String(invitee._id))) {
          list.members.push({ user: invitee._id, role: body.role || 'editor' });
        }
        await deliver(
          invitee._id,
          { title: `${me.name || me.email} shared "${list.name}" with you`, body: 'Open Pockeazy to see the list.', url: `/tasks?list=${list._id}`, type: 'share' },
          { inApp: true, push: true, email: false }
        );
      }
      await sendEmail({
        to: body.email,
        subject: `${me.name || 'Someone'} shared a list with you on Pockeazy`,
        heading: `You're invited to "${list.name}"`,
        body: `${me.name || me.email} wants to plan together with you on Pockeazy. Open the link to join the list.`,
        ctaLabel: 'Join the list',
        ctaUrl: link,
      });
      break;
    }
    case 'remove':
      list.members = list.members.filter((m) => String(m.user) !== body.userId);
      break;
    case 'role': {
      const m = list.members.find((mm) => String(mm.user) === body.userId);
      if (!m) throw new HttpError(404, 'Member not found');
      m.role = body.role;
      break;
    }
  }

  await list.save();
  await list.populate([
    { path: 'owner', select: 'name email image' },
    { path: 'members.user', select: 'name email image' },
  ]);
  return ok({ list: serializeList(list, userId) });
});
