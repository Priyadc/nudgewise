'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Bell, Check, Download, Globe, Laptop, Loader2, LogOut, Mail, Monitor, Moon, Palette, Smartphone, Sun, Trash2, UserRound, Coins, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/components/layout/AppContext';
import { Avatar, Switch } from '@/components/ui/Controls';
import { Confirm } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import { api } from '@/lib/client/api';
import { ACCENTS, applyAccent } from '@/lib/theme';
import { CURRENCIES } from '@/lib/format';
import { disablePush, enablePush, pushPermission } from '@/lib/client/push';

function Section({ icon: Icon, title, text, children, delay = 0 }) {
  return (
    <motion.section className="card card-pad" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="stat-icon">
          <Icon />
        </span>
        <div>
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          {text && <p className="small muted">{text}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney'];

export default function SettingsPage() {
  const { user, setUser, features } = useApp();
  const { update } = useSession();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [perm, setPerm] = useState('default');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPerm(pushPermission());
  }, []);
  useEffect(() => {
    if (user) setName(user.name || '');
  }, [user]);

  async function patch(body, msg) {
    try {
      const d = await api('/api/user', { method: 'PATCH', body });
      setUser(d.user);
      if (body.name || body.image !== undefined) await update({ name: d.user.name, image: d.user.image ?? null });
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const setSetting = (k, v, msg) => {
    setUser((u) => ({ ...u, settings: { ...u.settings, [k]: v } }));
    return patch({ settings: { [k]: v } }, msg);
  };

  async function togglePush(on) {
    try {
      if (on) {
        await enablePush();
        await api('/api/push/test', { method: 'POST' }).catch(() => {});
        toast.success('Push notifications enabled on this device');
      } else {
        await disablePush();
        toast.success('Push notifications turned off on this device');
      }
    } catch (err) {
      toast.error(err.message);
    }
    setPerm(pushPermission());
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await disablePush().catch(() => {});
      await api('/api/user', { method: 'DELETE' });
      toast.success('Your account has been deleted');
      signOut({ callbackUrl: '/' });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  if (!user) return <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />;
  const s = user.settings || {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Make Orbit yours.</p>
        </div>
        <button className="btn btn-outline" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut /> Sign out
        </button>
      </div>

      <div className="stack stack-lg" style={{ maxWidth: 820 }}>
        <Section icon={UserRound} title="Profile" text="How you appear to people you share lists with.">
          <div className="row row-wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
            <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
              <Avatar user={user} size="lg" />
              {features.uploads && (
                <div style={{ width: 92 }}>
                  <ImageUploader single value={[]} onChange={(v) => v[0] && patch({ image: v[0].url }, 'Photo updated')} />
                </div>
              )}
              {user.image && (
                <button className="btn btn-ghost btn-sm" onClick={() => patch({ image: null }, 'Photo removed')}>
                  Remove photo
                </button>
              )}
            </div>
            <div className="stack grow" style={{ minWidth: 240 }}>
              <div className="field">
                <label className="label" htmlFor="name">
                  Name
                </label>
                <div className="row" style={{ gap: 6 }}>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                  <button
                    className="btn btn-primary"
                    disabled={savingName || name.trim().length < 2 || name === user.name}
                    onClick={async () => {
                      setSavingName(true);
                      await patch({ name: name.trim() }, 'Name updated');
                      setSavingName(false);
                    }}
                  >
                    {savingName ? <Loader2 className="spin" /> : 'Save'}
                  </button>
                </div>
              </div>
              <div className="field">
                <span className="label">Email</span>
                <div className="input-wrap">
                  <Mail />
                  <input className="input" value={user.email} disabled />
                </div>
                <span className="hint">Signed in with {user.provider === 'google' ? 'Google' : 'email & password'}.</span>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Appearance" text="Light, dark or follow your device — plus your favourite colour." delay={0.05}>
          <div className="row" style={{ gap: 10, marginBottom: 20 }}>
            {[
              { v: 'light', label: 'Light', icon: Sun, bg: '#f7f5ff', fg: '#e8e4fb' },
              { v: 'dark', label: 'Dark', icon: Moon, bg: '#15121f', fg: '#262138' },
              { v: 'system', label: 'System', icon: Monitor, bg: 'linear-gradient(90deg,#f7f5ff 50%,#15121f 50%)', fg: '#8883' },
            ].map((t) => (
              <button key={t.v} className="theme-card" aria-pressed={mounted && theme === t.v} onClick={() => setTheme(t.v)}>
                <div className="theme-preview" style={{ background: t.bg }}>
                  <span style={{ width: '30%', borderRadius: 6, background: t.fg }} />
                  <span className="stack" style={{ flex: 1, gap: 5 }}>
                    <span style={{ height: 8, borderRadius: 4, background: 'var(--accent)' }} />
                    <span style={{ height: 8, width: '70%', borderRadius: 4, background: t.fg }} />
                  </span>
                </div>
                <span className="row" style={{ gap: 6 }}>
                  <t.icon size={15} /> {t.label}
                </span>
              </button>
            ))}
          </div>
          <span className="label">Accent colour</span>
          <div className="row row-wrap" style={{ gap: 12, marginTop: 10 }}>
            {ACCENTS.map((a) => (
              <motion.button
                key={a.id}
                whileTap={{ scale: 0.85 }}
                className="swatch"
                style={{ background: a.swatch }}
                aria-pressed={s.accent === a.id}
                aria-label={a.label}
                title={a.label}
                onClick={() => {
                  applyAccent(a.id);
                  setSetting('accent', a.id);
                }}
              >
                {s.accent === a.id && <Check />}
              </motion.button>
            ))}
          </div>
        </Section>

        <Section icon={Globe} title="Region" text="Used for money formatting and reminder emails." delay={0.1}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label row" htmlFor="currency" style={{ gap: 6 }}>
                <Coins size={15} /> Currency
              </label>
              <select id="currency" className="select" value={s.currency} onChange={(e) => setSetting('currency', e.target.value, 'Currency updated')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="tz">
                Time zone
              </label>
              <select id="tz" className="select" value={s.timezone} onChange={(e) => setSetting('timezone', e.target.value, 'Time zone updated')}>
                {[...new Set([s.timezone, ...TIMEZONES])].filter(Boolean).map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Notifications" text="Choose how reminders reach you." delay={0.15}>
          <div className="setting-row">
            <div>
              <div className="bold small row" style={{ gap: 6 }}>
                <Smartphone size={16} /> Push on this device
              </div>
              <div className="tiny muted">
                {!features.push
                  ? 'Not configured on the server yet (add VAPID keys).'
                  : perm === 'unsupported'
                    ? 'Not supported here. On iPhone, add Orbit to your Home Screen first.'
                    : perm === 'denied'
                      ? 'Blocked — allow notifications in your browser site settings.'
                      : 'Works on Android, desktop and installed iPhone apps.'}
              </div>
            </div>
            <Switch checked={perm === 'granted'} onChange={togglePush} disabled={!features.push || perm === 'unsupported' || perm === 'denied'} label="Push notifications" />
          </div>
          <div className="setting-row">
            <div>
              <div className="bold small row" style={{ gap: 6 }}>
                <Laptop size={16} /> Push on all devices
              </div>
              <div className="tiny muted">Master switch for push reminders across your devices.</div>
            </div>
            <Switch checked={s.pushReminders !== false} onChange={(v) => setSetting('pushReminders', v, v ? 'Push reminders on' : 'Push reminders off')} label="Push reminders" />
          </div>
          <div className="setting-row">
            <div>
              <div className="bold small row" style={{ gap: 6 }}>
                <Mail size={16} /> Email reminders
              </div>
              <div className="tiny muted">For bills and task reminders (and any reminder with email turned on).</div>
            </div>
            <Switch checked={s.emailReminders !== false} onChange={(v) => setSetting('emailReminders', v, v ? 'Email reminders on' : 'Email reminders off')} label="Email reminders" />
          </div>
        </Section>

        <Section icon={Download} title="Your data" text="Download everything you have stored in Orbit." delay={0.2}>
          <a className="btn btn-outline" href="/api/user/export" download>
            <Download /> Export as JSON
          </a>
        </Section>

        <Section icon={ShieldAlert} title="Danger zone" text="Deleting your account removes all lists, tasks, reminders and money records. This cannot be undone." delay={0.25}>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete my account
          </button>
        </Section>
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
        loading={deleting}
        title="Delete your account?"
        message="Everything will be permanently deleted, including lists you share with others."
        confirmLabel={deleting ? 'Deleting…' : 'Delete forever'}
      />
    </>
  );
}
