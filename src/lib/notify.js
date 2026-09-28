import webpush from 'web-push';
import nodemailer from 'nodemailer';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';

const pushReady = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushReady) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const emailReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter;
function mailer() {
  if (!emailReady) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Branded, email-client-safe HTML template */
export function emailTemplate({ heading, body, ctaLabel, ctaUrl }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f3ff;font-family:Segoe UI,Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;"><tr><td align="center">
  <table width="100%" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(76,29,149,.12);">
    <tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:22px 28px;color:#fff;font-size:20px;font-weight:700;">◉ Pockeazy</td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1e1b4b;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 22px;color:#4b5563;line-height:1.6;font-size:15px;">${escapeHtml(body)}</p>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;">${escapeHtml(ctaLabel || 'Open Pockeazy')}</a>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px;color:#9ca3af;font-size:12px;border-top:1px solid #f1f1f5;">You get this email because reminders are enabled in your Pockeazy settings.</td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendEmail({ to, subject, heading, body, ctaLabel, ctaUrl }) {
  const t = mailer();
  if (!t) return false;
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: `${heading}\n\n${body}${ctaUrl ? `\n\n${ctaUrl}` : ''}`,
      html: emailTemplate({ heading, body, ctaLabel, ctaUrl }),
    });
    return true;
  } catch (err) {
    console.error('[email]', err.message);
    return false;
  }
}

export async function sendPush(userId, payload) {
  if (!pushReady) return 0;
  const subs = await PushSubscription.find({ user: userId }).lean();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
        sent += 1;
      } catch (err) {
        // 404/410 = subscription expired or revoked → clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: s._id });
        } else {
          console.error('[push]', err.statusCode, err.body || err.message);
        }
      }
    })
  );
  return sent;
}

/**
 * Deliver a notification to a user on every enabled channel.
 * channels: { inApp, push, email }
 */
export async function deliver(userId, { title, body = '', url = '/dashboard', type = 'reminder' }, channels = {}) {
  const user = await User.findById(userId).lean();
  if (!user) return;
  const prefs = user.settings || {};
  const jobs = [];

  if (channels.inApp !== false) jobs.push(Notification.create({ user: userId, title, body, url, type }));
  if (channels.push !== false && prefs.pushReminders !== false) {
    jobs.push(sendPush(userId, { title, body, url, tag: `${type}-${Date.now()}` }));
  }
  if (channels.email && prefs.emailReminders !== false) {
    jobs.push(
      sendEmail({
        to: user.email,
        subject: `⏰ ${title}`,
        heading: title,
        body: body || 'This is your reminder from Pockeazy.',
        ctaLabel: 'Open Pockeazy',
        ctaUrl: `${appUrl()}${url}`,
      })
    );
  }
  await Promise.allSettled(jobs);
}

export { appUrl };
