'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronDown, Loader2, Mail, Smartphone, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { PickLabel } from '@/components/ui/Chips';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import { WhenPicker, RepeatPicker, REPEAT_OPTIONS } from '@/components/tasks/Pickers';
import { useApp } from '@/components/layout/AppContext';
import { api, emit } from '@/lib/client/api';
import { enablePush, pushPermission } from '@/lib/client/push';
import { buildDate, describeWhen, describeWhenInline, ymd, hm } from '@/lib/when';

function quickTimes(now = new Date()) {
  const inMin = (m) => new Date(now.getTime() + m * 60000);
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return [
    { label: 'In 15 min', d: inMin(15) },
    { label: 'In 1 hour', d: inMin(60) },
    ...(now.getHours() < 19 ? [{ label: 'Tonight, 8 PM', d: tonight }] : []),
    { label: 'Tomorrow, 9 AM', d: tomorrow },
  ];
}

function nextHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

function fromReminder(r) {
  const at = r?.remindAt ? new Date(r.remindAt) : nextHour();
  return {
    title: r?.title || '',
    note: r?.note || '',
    date: ymd(at),
    time: hm(at),
    repeat: r?.repeat || 'none',
    push: r?.channels?.push ?? true,
    email: r?.channels?.email ?? false,
  };
}

/** New / edit reminder: say what, tap when, done. */
export default function ReminderModal({ open, onClose, reminder }) {
  const { features } = useApp();
  const [f, setF] = useState(fromReminder(null));
  const [showNote, setShowNote] = useState(false);
  const [interim, setInterim] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setF(fromReminder(reminder));
    setShowNote(Boolean(reminder?.note));
    if (!reminder) setTimeout(() => titleRef.current?.focus(), 120);
  }, [open, reminder]);

  const set = (p) => setF((x) => ({ ...x, ...p }));
  const at = buildDate(f.date, f.time);
  const inPast = at && at < new Date();
  const repeatLabel = REPEAT_OPTIONS.find((r) => r.value === f.repeat)?.label.toLowerCase();

  async function turnOnPush() {
    try {
      await enablePush();
      await api('/api/push/test', { method: 'POST' }).catch(() => {});
      toast.success('Notifications are on for this device');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!f.title.trim()) {
      titleRef.current?.focus();
      return toast.error('What should we remind you about?');
    }
    if (inPast && f.repeat === 'none') return toast.error('That time has already passed — pick a later one');
    if (!f.push && !f.email) return toast.error('Choose how we should remind you');
    setSaving(true);
    const body = { title: f.title.trim(), note: f.note, remindAt: at, repeat: f.repeat, channels: { inApp: true, push: f.push, email: f.email } };
    try {
      if (reminder) {
        await api(`/api/reminders/${reminder._id}`, { method: 'PATCH', body });
        toast.success('Reminder updated');
      } else {
        await api('/api/reminders', { method: 'POST', body });
        toast.success('Reminder set', { description: describeWhen(f.date, f.time) });
        // Nudge people to allow notifications, so the reminder reaches them even when the app is closed
        if (features.push && f.push && pushPermission() === 'default') {
          toast('Get this reminder even when the app is closed?', { duration: 12000, action: { label: 'Turn on', onClick: turnOnPush } });
        }
      }
      emit('reminders-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={reminder ? 'Edit reminder' : 'New reminder'} size="lg">
      <form onSubmit={save} className="stack stack-lg">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={titleRef}
              className="title-input grow"
              value={f.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Remind me to…"
              maxLength={200}
              aria-label="What to remind you about"
              enterKeyHint="done"
            />
            <VoiceButton className="btn btn-soft btn-icon" onText={(t) => set({ title: f.title ? `${f.title} ${t}` : t })} onInterim={setInterim} title="Say it" />
          </div>
          <VoiceBar text={interim} />
        </div>

        <div>
          <PickLabel icon={Zap}>Quick pick</PickLabel>
          <div className="chip-row">
            {quickTimes().map((q) => {
              const active = f.date === ymd(q.d) && f.time === hm(q.d);
              return (
                <button key={q.label} type="button" className="pick-chip" aria-pressed={active} onClick={() => set({ date: ymd(q.d), time: hm(q.d) })}>
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        <WhenPicker date={f.date} time={f.time} allowNoDate={false} allowNoTime={false} dayLabel="Or choose a day" timeLabel="At what time" onChange={({ date, time }) => set({ date, time })} />
        <RepeatPicker value={f.repeat} onChange={(v) => set({ repeat: v })} label="How often" />

        <div>
          <PickLabel icon={BellRing}>Remind me by</PickLabel>
          <div className="chip-row">
            <button type="button" className="pick-chip" aria-pressed={f.push} onClick={() => set({ push: !f.push })}>
              <Smartphone /> Notification
            </button>
            <button type="button" className="pick-chip" aria-pressed={f.email} onClick={() => set({ email: !f.email })}>
              <Mail /> Email
            </button>
          </div>
        </div>

        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNote((s) => !s)} aria-expanded={showNote}>
            <ChevronDown style={{ transform: showNote ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /> {showNote ? 'Hide note' : 'Add a note'}
          </button>
          <AnimatePresence initial={false}>
            {showNote && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <textarea className="textarea" value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Anything you'll want to see when it pops up" style={{ minHeight: 70, marginTop: 10 }} maxLength={1000} aria-label="Note" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="summary-line" style={inPast ? { background: 'var(--warning-soft)' } : undefined}>
          <BellRing />
          <span>
            {inPast && f.repeat === 'none'
              ? 'That time has already passed — pick a later one'
              : `We'll remind you ${describeWhenInline(f.date, f.time)}${f.repeat !== 'none' ? `, then ${repeatLabel}` : ''}`}
          </span>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <Loader2 className="spin" /> : <BellRing />} {reminder ? 'Save reminder' : 'Set reminder'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
