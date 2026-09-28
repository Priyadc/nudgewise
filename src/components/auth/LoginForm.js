'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import AuthShell from './AuthShell';
import GoogleIcon from './GoogleIcon';

const ERRORS = {
  CredentialsSignin: 'Wrong email or password.',
  OAuthAccountNotLinked: 'This email is already registered with a different sign-in method.',
  AccessDenied: 'Access denied.',
  default: 'Sign-in failed. Please try again.',
};

export default function LoginForm({ googleEnabled, callbackUrl = '/dashboard', initialError }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ? ERRORS[initialError] || ERRORS.default : '');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(ERRORS[res.error] || ERRORS.default);
      return;
    }
    toast.success('Welcome back!');
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: 30 }}>Welcome back</h1>
      <p className="muted" style={{ margin: '8px 0 28px' }}>
        Sign in to pick up where you left off.
      </p>

      {googleEnabled && (
        <>
          <button type="button" className="btn btn-outline btn-lg btn-block" onClick={() => signIn('google', { callbackUrl })}>
            <GoogleIcon /> Continue with Google
          </button>
          <div className="or-line" style={{ margin: '22px 0' }}>
            or with email
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="stack" noValidate>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <div className="input-wrap">
            <Mail />
            <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <div className="row between">
            <label className="label" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>
          <div className="input-wrap">
            <Lock />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              className="input"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="btn btn-ghost btn-icon btn-sm input-action" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" disabled={loading || !email || !password} style={{ marginTop: 6 }}>
          {loading ? <Loader2 className="spin" /> : null} Sign in
        </button>
      </form>

      <p className="muted center" style={{ marginTop: 24 }}>
        New to Tickrupee?{' '}
        <Link href={`/register${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
