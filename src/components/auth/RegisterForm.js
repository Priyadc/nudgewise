'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import AuthShell from './AuthShell';
import GoogleIcon from './GoogleIcon';

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
}
const STRENGTH = [
  { label: 'Too short', color: 'var(--danger)' },
  { label: 'Weak', color: 'var(--danger)' },
  { label: 'Okay', color: 'var(--warning)' },
  { label: 'Good', color: 'var(--info)' },
  { label: 'Strong', color: 'var(--success)' },
];

export default function RegisterForm({ googleEnabled, callbackUrl = '/dashboard' }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const score = useMemo(() => strength(form.password), [form.password]);
  const rules = [
    { ok: form.password.length >= 8, text: '8+ characters' },
    { ok: /[A-Za-z]/.test(form.password), text: 'a letter' },
    { ok: /\d/.test(form.password), text: 'a number' },
  ];
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && rules.every((r) => r.ok);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create your account');

      const login = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (login?.error) throw new Error('Account created — please sign in.');
      toast.success(`Welcome to Pockeazy, ${form.name.split(' ')[0]}! 🎉`);
      router.replace(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: 30 }}>Create your account</h1>
      <p className="muted" style={{ margin: '8px 0 28px' }}>
        Free forever. Takes less than a minute.
      </p>

      {googleEnabled && (
        <>
          <button type="button" className="btn btn-outline btn-lg btn-block" onClick={() => signIn('google', { callbackUrl })}>
            <GoogleIcon /> Sign up with Google
          </button>
          <div className="or-line" style={{ margin: '22px 0' }}>
            or with email
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="stack" noValidate>
        <div className="field">
          <label className="label" htmlFor="name">
            Full name
          </label>
          <div className="input-wrap">
            <User />
            <input id="name" className="input" autoComplete="name" placeholder="Priya Sharma" value={form.name} onChange={set('name')} required />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <div className="input-wrap">
            <Mail />
            <input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="input-wrap">
            <Lock />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              className="input"
              autoComplete="new-password"
              placeholder="Create a password"
              value={form.password}
              onChange={set('password')}
              required
            />
            <button type="button" className="btn btn-ghost btn-icon btn-sm input-action" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {form.password && (
            <div className="stack stack-sm" style={{ marginTop: 4 }}>
              <div className="strength">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ background: i <= score ? STRENGTH[score].color : undefined }} />
                ))}
              </div>
              <div className="row row-wrap tiny" style={{ gap: 12 }}>
                <span style={{ color: STRENGTH[score].color, fontWeight: 700 }}>{STRENGTH[score].label}</span>
                {rules.map((r) => (
                  <span key={r.text} className="row" style={{ gap: 4, color: r.ok ? 'var(--success)' : 'var(--text-3)' }}>
                    <Check size={13} /> {r.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" disabled={loading || !valid} style={{ marginTop: 6 }}>
          {loading ? <Loader2 className="spin" /> : null} Create account
        </button>
        <p className="hint center">By signing up you agree to use Pockeazy responsibly. Your data is private to you.</p>
      </form>

      <p className="muted center" style={{ marginTop: 20 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
