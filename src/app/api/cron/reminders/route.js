import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import { processDueReminders } from '@/lib/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : new URL(req.url).searchParams.get('key') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Called every minute by an external scheduler (cron-job.org / GitHub Actions / Upstash QStash)
 * because Vercel's free Hobby cron can only run once per day.
 */
async function handler(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const result = await processDueReminders();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export { handler as GET, handler as POST };
