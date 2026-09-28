import bcrypt from 'bcryptjs';
import { route, ok, fail, readJson } from '@/lib/api';
import { registerSchema } from '@/lib/validators';
import User from '@/models/User';
import List from '@/models/List';

export const POST = route(
  async (req) => {
    const body = registerSchema.parse(await readJson(req));
    const exists = await User.findOne({ email: body.email }).lean();
    if (exists) {
      return fail(
        exists.provider === 'google'
          ? 'This email is registered with Google. Use "Continue with Google".'
          : 'An account with this email already exists.',
        409
      );
    }
    const password = await bcrypt.hash(body.password, 12);
    const user = await User.create({ name: body.name, email: body.email, password, provider: 'credentials' });

    // Starter lists so the app never feels empty
    await List.insertMany([
      { name: 'Personal', icon: '🏠', color: '#8b5cf6', owner: user._id },
      { name: 'Work', icon: '💼', color: '#3b82f6', owner: user._id },
      { name: 'Shopping', icon: '🛒', color: '#10b981', owner: user._id },
    ]);

    return ok({ id: user._id.toString() }, 201);
  },
  { auth: false }
);
