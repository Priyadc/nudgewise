'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, ChevronDown, ListChecks, Loader2, NotebookPen, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import { WhenPicker, RemindPicker, PriorityPicker, RepeatPicker, ListPicker } from './Pickers';
import { useApp } from '@/components/layout/AppContext';
import { api, emit } from '@/lib/client/api';
import { buildDate, buildReminder, describeWhen, describeWhenInline, describeDateInline } from '@/lib/when';

const EMPTY = { title: '', date: '', time: '', remind: 'none', custom: '', priority: 0, list: '', repeat: 'none', notes: '', subtasks: [] };

/** Step-by-step "New task" sheet: type what, then tap when / remind / importance / list */
export default function TaskModal({ open, onClose, defaults = {} }) {
  const { lists } = useApp();
  const [f, setF] = useState(EMPTY);
  const [more, setMore] = useState(false);
  const [sub, setSub] = useState('');
  const [interim, setInterim] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setF({ ...EMPTY, list: defaults.list || '', date: defaults.date || '' });
    setMore(false);
    setSub('');
    setTimeout(() => titleRef.current?.focus(), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const editable = lists.filter((l) => l.role !== 'viewer');
  const reminderAt = buildReminder(f.date, f.time, f.remind, f.custom);
  const reminderInPast = reminderAt && reminderAt < new Date();

  async function save(e) {
    e?.preventDefault();
    if (!f.title.trim()) {
      titleRef.current?.focus();
      return toast.error('What do you need to do? Add a title first.');
    }
    setSaving(true);
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: {
          title: f.title.trim(),
          notes: f.notes,
          dueDate: buildDate(f.date, f.time),
          hasTime: Boolean(f.date && f.time),
          reminderAt,
          priority: f.priority,
          repeat: f.date ? f.repeat : 'none',
          list: f.list || null,
          subtasks: f.subtasks.filter((s) => s.title.trim()),
        },
      });
      toast.success('Task added', { description: f.date ? `${f.title.trim()} · ${describeWhen(f.date, f.time)}` : f.title.trim() });
      emit('tasks-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addSub(e) {
    e.preventDefault();
    if (!sub.trim()) return;
    set({ subtasks: [...f.subtasks, { title: sub.trim(), done: false }] });
    setSub('');
  }

  return (
    <Modal open={open} onClose={onClose} title="New task" size="lg">
      <form onSubmit={save} className="stack stack-lg">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={titleRef}
              className="title-input grow"
              value={f.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="What needs to get done?"
              maxLength={300}
              aria-label="Task title"
              enterKeyHint="done"
            />
            <VoiceButton className="btn btn-soft btn-icon" onText={(t) => set({ title: f.title ? `${f.title} ${t}` : t })} onInterim={setInterim} title="Say the task" />
          </div>
          <VoiceBar text={interim} />
        </div>

        <WhenPicker date={f.date} time={f.time} onChange={({ date, time }) => set({ date, time, remind: date ? f.remind : f.remind === 'custom' ? 'custom' : 'none' })} />
        <RemindPicker date={f.date} time={f.time} remind={f.remind} custom={f.custom} onChange={(r) => set(r)} />
        <PriorityPicker value={f.priority} onChange={(v) => set({ priority: v })} />
        {editable.length > 0 && <ListPicker lists={editable} value={f.list} onChange={(v) => set({ list: v })} />}
        {f.date && <RepeatPicker value={f.repeat} onChange={(v) => set({ repeat: v })} />}

        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            <ChevronDown style={{ transform: more ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /> {more ? 'Fewer options' : 'Add notes or a checklist'}
          </button>
          <AnimatePresence initial={false}>
            {more && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="stack" style={{ paddingTop: 12 }}>
                  <div className="field">
                    <span className="label row" style={{ gap: 6 }}>
                      <NotebookPen size={15} /> Notes
                    </span>
                    <textarea className="textarea" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Links, details, anything you'll want later" style={{ minHeight: 80 }} />
                  </div>
                  <div className="field">
                    <span className="label row" style={{ gap: 6 }}>
                      <ListChecks size={15} /> Checklist
                    </span>
                    {f.subtasks.map((s, i) => (
                      <div key={i} className="subtask">
                        <span className="grow small">{s.title}</span>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => set({ subtasks: f.subtasks.filter((_, j) => j !== i) })} aria-label="Remove item" style={{ width: 26, height: 26 }}>
                          <X />
                        </button>
                      </div>
                    ))}
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input" value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSub(e)} placeholder="Add a step" style={{ height: 38 }} />
                      <button type="button" className="btn btn-soft btn-icon" onClick={addSub} aria-label="Add step" style={{ height: 38, width: 38 }}>
                        <Plus />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {(f.date || reminderAt) && (
          <div className="summary-line" style={reminderInPast ? { background: 'var(--warning-soft)' } : undefined}>
            <CalendarCheck />
            <span>
              {f.date ? `Due ${describeWhenInline(f.date, f.time)}` : 'No due date'}
              {reminderAt ? ` · we'll remind you ${describeDateInline(reminderAt)}` : ''}
              {reminderInPast ? ' — that time has already passed' : ''}
            </span>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <Loader2 className="spin" /> : <Plus />} Add task
          </button>
        </div>
      </form>
    </Modal>
  );
}
