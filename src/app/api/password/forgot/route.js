import crypto from 'crypto';
import { z } from 'zod';
import { route, ok, readJson } from '@/lib/api';
import { sendEmail, appUrl, emailReady } from '@/lib/notify';
import User from '@/models/User';

export const POST = route(
  async (req) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(await readJson(req));
    const user = await User.findOne({ email });

    // Always answer the same way so attackers can't discover which emails exist
    const response = ok({ message: 'If that email has an account, a reset link is on its way.', emailReady });
    if (!user) return response;

    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Reset your Orbit password',
      heading: 'Reset your password',
      body: 'Click the button below to choose a new password. The link expires in 30 minutes. If you did not ask for this, you can ignore this email.',
      ctaLabel: 'Reset password',
      ctaUrl: `${appUrl()}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`,
    });
    return response;
  },
  { auth: false }
);
