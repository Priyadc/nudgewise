import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import List from '@/models/List';
import Task from '@/models/Task';
import AuthShell from '@/components/auth/AuthShell';
import JoinButton from './JoinButton';

export const metadata = { title: 'Join a shared list' };

async function getPreview(token) {
  if (!token || token.length < 10) return null;
  await dbConnect();
  const list = await List.findOne({ shareToken: token, shareEnabled: true }).populate('owner', 'name').lean();
  if (!list) return null;
  const pending = await Task.countDocuments({ list: list._id, done: false });
  return { name: list.name, icon: list.icon, color: list.color, owner: list.owner?.name, members: list.members.length + 1, pending, role: list.shareRole };
}

export default async function SharePage({ params }) {
  const { token } = await params;
  const [preview, session] = await Promise.all([getPreview(token), getServerSession(authOptions)]);

  return (
    <AuthShell>
      {!preview ? (
        <div className="stack">
          <h1 style={{ fontSize: 28 }}>Link not available</h1>
          <p className="muted">This share link is invalid or the owner has turned sharing off. Ask them to send a new link.</p>
          <Link href="/" className="btn btn-soft" style={{ alignSelf: 'flex-start' }}>
            Go to Tickrupee
          </Link>
        </div>
      ) : (
        <div className="stack stack-lg">
          <div style={{ width: 72, height: 72, borderRadius: 22, display: 'grid', placeItems: 'center', fontSize: 34, background: `${preview.color}22`, border: `2px solid ${preview.color}` }}>
            {preview.icon}
          </div>
          <div>
            <p className="muted small">{preview.owner || 'Someone'} invited you to</p>
            <h1 style={{ fontSize: 30, marginTop: 4 }}>{preview.name}</h1>
          </div>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <span className="chip">{preview.pending} open tasks</span>
            <span className="chip">{preview.members} member{preview.members > 1 ? 's' : ''}</span>
            <span className="chip chip-accent">You can {preview.role === 'viewer' ? 'view' : 'view & edit'}</span>
          </div>
          {session ? (
            <JoinButton token={token} />
          ) : (
            <div className="stack">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`} className="btn btn-primary btn-lg btn-block">
                Sign in to join
              </Link>
              <Link href={`/register?callbackUrl=${encodeURIComponent(`/share/${token}`)}`} className="btn btn-outline btn-lg btn-block">
                Create a free account
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}
