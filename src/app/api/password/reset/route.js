import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { route, ok, fail, readJson } from '@/lib/api';
import { registerSchema } from '@/lib/validators';
import User from '@/models/User';

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(20).max(200),
  password: registerSchema.shape.password,
});

export const POST = route(
  async (req) => {
    const { email, token, password } = schema.parse(await readJson(req));
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email, resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select(
      '+resetTokenHash +resetTokenExpires'
    );
    if (!user) return fail('This reset link is invalid or has expired. Request a new one.', 400);

    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    if (user.provider === 'google') user.provider = 'credentials';
    await user.save();
    return ok({ message: 'Password updated. You can sign in now.' });
  },
  { auth: false }
);
