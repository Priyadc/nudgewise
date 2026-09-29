'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Copy, Hash, Loader2, Plus, Share2, Trash2, UserRound, X, ListChecks, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui/Modal';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import Menu from '@/components/ui/Menu';
import { TaskCheck, deleteTask } from './TaskItem';
import { WhenPicker, RemindPicker, PriorityPicker, RepeatPicker, ListPicker } from './Pickers';
import { api, emit } from '@/lib/client/api';
import { relativeDay, formatTime } from '@/lib/format';
import { buildDate, buildReminder, deriveRemind, describeWhenInline, describeDateInline, ymd, hm } from '@/lib/when';
import { useApp } from '@/components/layout/AppContext';

function fromTask(t) {
  return {
    title: t.title || '',
    notes: t.notes || '',
    date: t.dueDate ? ymd(new Date(t.dueDate)) : '',
    time: t.dueDate && t.hasTime ? hm(new Date(t.dueDate)) : '',
    ...deriveRemind(t.dueDate, t.hasTime, t.reminderAt),
    priority: t.priority || 0,
    repeat: t.repeat || 'none',
    list: t.list?._id || t.list || '',
    tags: t.tags || [],
    subtasks: (t.subtasks || []).map((s) => ({ title: s.title, done: s.done })),
    assignee: t.assignee?._id || t.assignee || '',
  };
}

function shareText(t) {
  const lines = [`✅ ${t.title}`];
  if (t.dueDate) lines.push(`📅 ${relativeDay(t.dueDate)}${t.hasTime ? ` at ${formatTime(t.dueDate)}` : ''}`);
  if (t.notes) lines.push('', t.notes);
  if (t.subtasks?.length) lines.push('', ...t.subtasks.map((s) => `${s.done ? '☑' : '☐'} ${s.title}`));
  return lines.join('\n');
}

export default function TaskDrawer({ task, open, onClose, onChanged, onDeleted }) {
  const { lists } = useApp();
  const [form, setForm] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [interim, setInterim] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) setForm(fromTask(task));
  }, [task]);

  const list = lists.find((l) => l._id === form?.list);
  const readOnly = list?.role === 'viewer';
  const members = useMemo(() => {
    if (!list || !list.shared) return [];
    return [list.owner, ...(list.members || []).map((m) => m.user)].filter(Boolean);
  }, [list]);

  if (!task || !form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function payload() {
    return {
      title: form.title.trim(),
      notes: form.notes,
      dueDate: buildDate(form.date, form.time),
      hasTime: Boolean(form.date && form.time),
      reminderAt: buildReminder(form.date, form.time, form.remind, form.custom),
      priority: form.priority,
      repeat: form.date ? form.repeat : 'none',
      list: form.list || null,
      tags: form.tags,
      subtasks: form.subtasks.filter((s) => s.title.trim()),
      assignee: form.assignee || null,
    };
  }

  async function save(extra = {}) {
    if (!form.title.trim()) return toast.error('Title cannot be empty');
    setSaving(true);
    try {
      const d = await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: { ...payload(), ...extra } });
      if (d.task) onChanged?.(d.task);
      emit('tasks-changed');
      if (d.rescheduled) toast.success('Nice! Next one scheduled', { description: relativeDay(d.task.dueDate) });
      else if (!d.offline) toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    onClose();
    deleteTask(task, onDeleted);
  }

  async function share() {
    const text = shareText({ ...task, ...payload() });
    if (navigator.share) {
      try {
        await navigator.share({ title: form.title, text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard — paste it anywhere');
  }

  function addTag(e) {
    e.preventDefault();
    const t = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (t && !form.tags.includes(t) && form.tags.length < 10) set({ tags: [...form.tags, t] });
    setTagInput('');
  }
  function addSub(e) {
    e.preventDefault();
    const t = subInput.trim();
    if (t) set({ subtasks: [...form.subtasks, { title: t, done: false }] });
    setSubInput('');
  }

  const doneCount = form.subtasks.filter((s) => s.done).length;
  const reminderAt = buildReminder(form.date, form.time, form.remind, form.custom);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        header={
          <>
            <TaskCheck done={task.done} priority={form.priority} onToggle={() => !readOnly && save({ done: !task.done })} />
            <span className="small muted">{task.done ? 'Completed' : 'Task details'}</span>
            <Menu
              trigger={
                <button className="btn btn-ghost btn-icon btn-sm" aria-label="Share">
                  <Share2 />
                </button>
              }
              items={[
                { label: 'Share…', icon: Share2, onClick: share },
                {
                  label: 'Send on WhatsApp',
                  icon: Copy,
                  onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText({ ...task, ...payload() }))}`, '_blank', 'noopener'),
                },
              ]}
            />
            {!readOnly && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={remove} aria-label="Delete task">
                <Trash2 />
              </button>
            )}
          </>
        }
      >
        {readOnly && <div className="chip chip-warning" style={{ alignSelf: 'flex-start' }}>View only — you can't edit this shared list</div>}

        <textarea
          className="textarea"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          rows={2}
          disabled={readOnly}
          style={{ fontSize: 19, fontWeight: 700, minHeight: 0, border: 0, padding: 0, background: 'transparent', boxShadow: 'none' }}
          aria-label="Task title"
        />

        <WhenPicker date={form.date} time={form.time} disabled={readOnly} onChange={({ date, time }) => set({ date, time })} />
        <RemindPicker date={form.date} time={form.time} remind={form.remind} custom={form.custom} disabled={readOnly} onChange={(r) => set(r)} />
        <PriorityPicker value={form.priority} disabled={readOnly} onChange={(v) => set({ priority: v })} />
        {form.date && <RepeatPicker value={form.repeat} disabled={readOnly} onChange={(v) => set({ repeat: v })} />}
        {!readOnly && <ListPicker lists={lists.filter((l) => l.role !== 'viewer')} value={form.list} onChange={(v) => set({ list: v, assignee: '' })} />}
        {(form.date || reminderAt) && (
          <div className="summary-line">
            <CalendarCheck />
            <span>
              {form.date ? `Due ${describeWhenInline(form.date, form.time)}` : 'No due date'}
              {reminderAt ? ` · reminder ${describeDateInline(reminderAt)}` : ''}
            </span>
          </div>
        )}

        {members.length > 1 && (
          <div className="field">
            <span className="label row" style={{ gap: 6 }}>
              <UserRound size={15} /> Assign to
            </span>
            <select className="select" value={form.assignee} onChange={(e) => set({ assignee: e.target.value })} disabled={readOnly}>
              <option value="">Nobody</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <span className="label row between">
            <span className="row" style={{ gap: 6 }}>
              <NotebookPen size={15} /> Notes
            </span>
            {!readOnly && (
              <VoiceButton
                className="btn btn-soft btn-sm"
                title="Dictate notes"
                continuous
                onInterim={setInterim}
                onText={(t) => setForm((f) => ({ ...f, notes: f.notes ? `${f.notes.trimEnd()} ${t}` : t }))}
              />
            )}
          </span>
          <VoiceBar text={interim} />
          <textarea className="textarea" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Add details, links, anything…" disabled={readOnly} />
        </div>

        <div className="field">
          <span className="label row between">
            <span className="row" style={{ gap: 6 }}>
              <ListChecks size={15} /> Checklist
            </span>
            {form.subtasks.length > 0 && (
              <span className="tiny faint">
                {doneCount}/{form.subtasks.length} done
              </span>
            )}
          </span>
          <div className="stack stack-sm">
            <AnimatePresence initial={false}>
              {form.subtasks.map((s, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`subtask ${s.done ? 'done' : ''}`}>
                  <TaskCheck
                    done={s.done}
                    onToggle={() => !readOnly && set({ subtasks: form.subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                  />
                  <input value={s.title} onChange={(e) => set({ subtasks: form.subtasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} disabled={readOnly} aria-label="Checklist item" />
                  {!readOnly && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => set({ subtasks: form.subtasks.filter((_, j) => j !== i) })} aria-label="Remove item" style={{ width: 26, height: 26 }}>
                      <X />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {!readOnly && (
              <form onSubmit={addSub} className="row" style={{ gap: 6 }}>
                <input className="input" value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="Add a checklist item" style={{ height: 38 }} />
                <button className="btn btn-soft btn-icon" aria-label="Add item" style={{ height: 38, width: 38 }}>
                  <Plus />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="field">
          <span className="label row" style={{ gap: 6 }}>
            <Hash size={15} /> Tags
          </span>
          <div className="row row-wrap" style={{ gap: 6 }}>
            {form.tags.map((t) => (
              <button key={t} type="button" className="chip chip-accent" onClick={() => !readOnly && set({ tags: form.tags.filter((x) => x !== t) })}>
                #{t} {!readOnly && <X />}
              </button>
            ))}
            {!readOnly && (
              <form onSubmit={addTag}>
                <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="+ tag" style={{ height: 30, width: 110, fontSize: 13 }} />
              </form>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="row" style={{ position: 'sticky', bottom: 0, paddingTop: 12, paddingBottom: 4, background: 'var(--surface-solid)', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => save()} disabled={saving}>
              {saving && <Loader2 className="spin" />} Save changes
            </button>
          </div>
        )}
      </Drawer>
    </>
  );
}
