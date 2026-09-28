'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from './AuthShell';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.emailReady === false) toast.warning('Email is not configured on this server yet, so no email was sent.');
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <div className="empty-icon">
            <MailCheck />
          </div>
          <h1 style={{ fontSize: 28 }}>Check your inbox</h1>
          <p className="muted">If {email} has an Orbit account, we sent a link to reset your password. It expires in 30 minutes.</p>
          <Link href="/login" className="btn btn-soft" style={{ marginTop: 10 }}>
            <ArrowLeft /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: 28 }}>Forgot your password?</h1>
          <p className="muted" style={{ margin: '8px 0 26px' }}>
            Enter your email and we will send you a reset link.
          </p>
          <form onSubmit={onSubmit} className="stack">
            <div className="input-wrap">
              <Mail />
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={loading || !email}>
              {loading && <Loader2 className="spin" />} Send reset link
            </button>
            <Link href="/login" className="btn btn-ghost btn-block">
              <ArrowLeft /> Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export function ResetForm({ token, email }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <AuthShell>
        <h1 style={{ fontSize: 28 }}>Invalid link</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>
          This reset link is incomplete. Request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-primary">
          Request new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {done ? (
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <h1 style={{ fontSize: 28 }}>Password updated 🎉</h1>
          <p className="muted">You can now sign in with your new password.</p>
          <Link href="/login" className="btn btn-primary" style={{ marginTop: 10 }}>
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: 28 }}>Choose a new password</h1>
          <p className="muted" style={{ margin: '8px 0 26px' }}>
            For {email}
          </p>
          <form onSubmit={onSubmit} className="stack">
            <div className="input-wrap">
              <Lock />
              <input type="password" className="input" placeholder="New password (8+ chars, letters & numbers)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required autoFocus />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={loading || password.length < 8}>
              {loading && <Loader2 className="spin" />} Update password
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
