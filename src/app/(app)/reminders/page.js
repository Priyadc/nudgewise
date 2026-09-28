'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Bell, BellOff, BellRing, Check, Clock, Loader2, Mail, MoreHorizontal, Pencil, Plus, Repeat, RotateCcw, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, SkeletonList, Switch, Tabs } from '@/components/ui/Controls';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import Menu from '@/components/ui/Menu';
import { api, on } from '@/lib/client/api';
import { enablePush, pushPermission } from '@/lib/client/push';
import { formatTime, relativeDay, toLocalInput } from '@/lib/format';
import { useApp } from '@/components/layout/AppContext';

const REPEATS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function defaultTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return toLocalInput(d);
}

function ReminderForm({ initial, onSubmit, saving }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [note, setNote] = useState(initial?.note || '');
  const [when, setWhen] = useState(initial?.remindAt ? toLocalInput(initial.remindAt) : defaultTime());
  const [repeat, setRepeat] = useState(initial?.repeat || 'none');
  const [email, setEmail] = useState(initial?.channels?.email ?? false);
  const [push, setPush] = useState(initial?.channels?.push ?? true);
  const [interim, setInterim] = useState('');

  const presets = [
    { label: 'In 30 min', d: () => new Date(Date.now() + 30 * 60000) },
    { label: 'In 1 hour', d: () => new Date(Date.now() + 3600000) },
    { label: 'Tonight 8pm', d: () => new Date(new Date().setHours(20, 0, 0, 0)) },
    { label: 'Tomorrow 9am', d: () => { const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(9, 0, 0, 0); return t; } },
  ];

  return (
    <form
      className="stack stack-lg"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, note, remindAt: new Date(when), repeat, channels: { inApp: true, push, email } });
      }}
    >
      <div className="field">
        <label className="label" htmlFor="r-title">
          Remind me to…
        </label>
        <div className="row" style={{ gap: 6 }}>
          <input id="r-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Take medicine, call the bank…" autoFocus required maxLength={200} />
          <VoiceButton className="btn btn-soft btn-icon" onText={(t) => setTitle((p) => (p ? `${p} ${t}` : t))} onInterim={setInterim} />
        </div>
        <VoiceBar text={interim} />
      </div>
      <div className="field">
        <label className="label" htmlFor="r-when">
          When
        </label>
        <input id="r-when" className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        <div className="row row-wrap" style={{ gap: 6 }}>
          {presets.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => setWhen(toLocalInput(p.d()))}>
              <Clock /> {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Repeat</span>
        <div className="row row-wrap" style={{ gap: 6 }}>
          {REPEATS.map((r) => (
            <button key={r.value} type="button" className="chip chip-select" aria-pressed={repeat === r.value} onClick={() => setRepeat(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="r-note">
          Note (optional)
        </label>
        <textarea id="r-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} maxLength={1000} />
      </div>
      <div className="card" style={{ padding: '4px 16px', background: 'var(--surface-2)' }}>
        <div className="setting-row">
          <span className="row small bold">
            <Smartphone size={17} /> Push notification
          </span>
          <Switch checked={push} onChange={setPush} label="Push notification" />
        </div>
        <div className="setting-row">
          <span className="row small bold">
            <Mail size={17} /> Email me too
          </span>
          <Switch checked={email} onChange={setEmail} label="Email reminder" />
        </div>
      </div>
      <button className="btn btn-primary btn-lg btn-block" disabled={saving || !title.trim() || !when}>
        {saving && <Loader2 className="spin" />} {initial ? 'Save reminder' : 'Set reminder'}
      </button>
    </form>
  );
}

export default function RemindersPage() {
  const { features } = useApp();
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | reminder
  const [saving, setSaving] = useState(false);
  const [perm, setPerm] = useState('default');

  useEffect(() => setPerm(pushPermission()), []);

  const load = useCallback(async () => {
    try {
      const d = await api('/api/reminders');
      setItems(d.reminders);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('reminders-changed', load), [load]);

  const now = Date.now();
  const active = useMemo(() => (items || []).filter((r) => r.status === 'active').sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt)), [items]);
  const done = useMemo(() => (items || []).filter((r) => r.status === 'done').reverse(), [items]);
  const shown = tab === 'active' ? active : done;

  async function save(body) {
    setSaving(true);
    try {
      if (modal === 'new') {
        await api('/api/reminders', { method: 'POST', body });
        toast.success('Reminder set', { description: `${relativeDay(body.remindAt)} at ${formatTime(body.remindAt)}` });
        // Nudge people to allow notifications, so the reminder reaches them even when the app is closed
        if (features.push && pushPermission() === 'default') {
          toast('Get this reminder even when the app is closed?', {
            duration: 12000,
            action: { label: 'Turn on', onClick: turnOnPush },
          });
        }
      } else {
        await api(`/api/reminders/${modal._id}`, { method: 'PATCH', body });
        toast.success('Reminder updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function patch(r, body, msg) {
    setItems((xs) => xs.map((x) => (x._id === r._id ? { ...x, ...body } : x)));
    try {
      await api(`/api/reminders/${r._id}`, { method: 'PATCH', body });
      if (msg) toast.success(msg);
      load();
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }

  async function remove(r) {
    setItems((xs) => xs.filter((x) => x._id !== r._id));
    try {
      await api(`/api/reminders/${r._id}`, { method: 'DELETE' });
      toast.success('Reminder deleted');
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }

  const snooze = (r, mins) => patch(r, { remindAt: new Date(Date.now() + mins * 60000), status: 'active' }, `Snoozed for ${mins >= 60 ? `${mins / 60}h` : `${mins} min`}`);

  async function turnOnPush() {
    try {
      await enablePush();
      setPerm('granted');
      await api('/api/push/test', { method: 'POST' }).catch(() => {});
      toast.success('Notifications enabled on this device');
    } catch (err) {
      toast.error(err.message);
      setPerm(pushPermission());
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reminders</h1>
          <p>We will nudge you on your phone, browser or email — right on time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus /> New reminder
        </button>
      </div>

      <AnimatePresence>
        {features.push && perm !== 'granted' && perm !== 'unsupported' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="card card-pad row row-wrap between" style={{ marginBottom: 20, gap: 14, borderColor: 'var(--accent-ring)' }}>
            <div className="row">
              <span className="stat-icon">
                <BellRing />
              </span>
              <div>
                <div className="bold">Get reminders even when Pockeazy is closed</div>
                <div className="small muted">{perm === 'denied' ? 'Notifications are blocked — allow them in your browser site settings.' : 'Turn on push notifications for this device.'}</div>
              </div>
            </div>
            {perm !== 'denied' && (
              <button className="btn btn-primary" onClick={turnOnPush}>
                <Bell /> Enable notifications
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stack stack-lg">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'active', label: 'Scheduled', icon: AlarmClock, count: active.length },
            { value: 'done', label: 'Done', icon: Check },
          ]}
        />

        {!items ? (
          <SkeletonList rows={4} h={72} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={tab === 'active' ? BellOff : Check}
            title={tab === 'active' ? 'No reminders yet' : 'Nothing here yet'}
            text={tab === 'active' ? 'Set one here, or say "remind me to call mom tomorrow at 7pm" in quick add.' : 'Reminders you mark as done show up here.'}
            action={tab === 'active' && <button className="btn btn-soft" onClick={() => setModal('new')}><Plus /> New reminder</button>}
          />
        ) : (
          <div className="task-list">
            <AnimatePresence initial={false}>
              {shown.map((r) => {
                const due = new Date(r.remindAt).getTime();
                const past = due < now && r.status === 'active';
                return (
                  <motion.div key={r._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="task-row" style={{ alignItems: 'center', cursor: 'default' }}>
                    <span className="stat-icon" style={{ width: 42, height: 42, borderRadius: 14, ...(past ? { background: 'var(--warning-soft)', color: 'var(--warning)' } : {}) }}>
                      {r.task ? <Check /> : <Bell />}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="task-title" style={r.status === 'done' ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}>
                        {r.title}
                      </div>
                      <div className="task-meta">
                        <span className={`chip ${past ? 'chip-warning' : 'chip-accent'}`}>
                          <Clock /> {relativeDay(r.remindAt)} · {formatTime(r.remindAt)}
                        </span>
                        {r.repeat !== 'none' && (
                          <span className="chip chip-info">
                            <Repeat /> {r.repeat}
                          </span>
                        )}
                        {r.channels?.email && (
                          <span className="chip">
                            <Mail /> email
                          </span>
                        )}
                        {r.task && <span className="chip">from a task</span>}
                        {r.note && <span className="small muted truncate">{r.note}</span>}
                      </div>
                    </div>
                    {r.status === 'active' ? (
                      <button className="btn btn-soft btn-sm hide-mobile" onClick={() => patch(r, { status: 'done' }, 'Marked as done')}>
                        <Check /> Done
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => patch(r, { status: 'active', remindAt: due > now ? r.remindAt : new Date(now + 3600000) }, 'Reminder restored')}>
                        <RotateCcw /> Restore
                      </button>
                    )}
                    <Menu
                      trigger={
                        <button className="btn btn-ghost btn-icon btn-sm" aria-label="More">
                          <MoreHorizontal />
                        </button>
                      }
                      items={[
                        r.status === 'active' && { label: 'Mark done', icon: Check, onClick: () => patch(r, { status: 'done' }, 'Marked as done') },
                        { label: 'Snooze 10 minutes', icon: AlarmClock, onClick: () => snooze(r, 10) },
                        { label: 'Snooze 1 hour', icon: AlarmClock, onClick: () => snooze(r, 60) },
                        { label: 'Snooze until tomorrow', icon: AlarmClock, onClick: () => snooze(r, 24 * 60) },
                        !r.task && { label: 'Edit', icon: Pencil, onClick: () => setModal(r) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r) },
                      ]}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal === 'new' ? 'New reminder' : 'Edit reminder'}>
        {modal && <ReminderForm key={modal === 'new' ? 'new' : modal._id} initial={modal === 'new' ? null : modal} onSubmit={save} saving={saving} />}
      </Modal>
    </>
  );
}
