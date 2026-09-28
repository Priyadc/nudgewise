'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarDays, Copy, Flag, FolderOpen, Hash, Loader2, Plus, Repeat, Share2, Trash2, UserRound, X, Image as ImageIcon, ListChecks, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer, Confirm } from '@/components/ui/Modal';
import { Segmented, Switch } from '@/components/ui/Controls';
import ImageUploader from '@/components/ui/ImageUploader';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import Menu from '@/components/ui/Menu';
import { TaskCheck } from './TaskItem';
import { api, emit } from '@/lib/client/api';
import { PRIORITIES, relativeDay, formatTime, toLocalInput, toDateInput } from '@/lib/format';
import { useApp } from '@/components/layout/AppContext';

const REPEATS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

function fromTask(t) {
  return {
    title: t.title || '',
    notes: t.notes || '',
    hasTime: Boolean(t.hasTime),
    due: t.dueDate ? (t.hasTime ? toLocalInput(t.dueDate) : toDateInput(t.dueDate)) : '',
    reminderAt: t.reminderAt ? toLocalInput(t.reminderAt) : '',
    priority: t.priority || 0,
    repeat: t.repeat || 'none',
    list: t.list?._id || t.list || '',
    tags: t.tags || [],
    subtasks: (t.subtasks || []).map((s) => ({ title: s.title, done: s.done })),
    attachments: t.attachments || [],
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
  const [confirm, setConfirm] = useState(false);

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
    let dueDate = null;
    if (form.due) {
      dueDate = form.hasTime ? new Date(form.due) : new Date(`${form.due.slice(0, 10)}T23:59:00`);
    }
    return {
      title: form.title.trim(),
      notes: form.notes,
      dueDate,
      hasTime: form.hasTime,
      reminderAt: form.reminderAt ? new Date(form.reminderAt) : null,
      priority: form.priority,
      repeat: form.repeat,
      list: form.list || null,
      tags: form.tags,
      subtasks: form.subtasks.filter((s) => s.title.trim()),
      attachments: form.attachments,
      assignee: form.assignee || null,
    };
  }

  async function save(extra = {}) {
    if (!form.title.trim()) return toast.error('Title cannot be empty');
    setSaving(true);
    try {
      const d = await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: { ...payload(), ...extra } });
      onChanged?.(d.task);
      emit('tasks-changed');
      if (d.rescheduled) toast.success('Nice! Next one scheduled', { description: relativeDay(d.task.dueDate) });
      else toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/tasks/${task._id}`, { method: 'DELETE' });
      onDeleted?.(task._id);
      emit('tasks-changed');
      toast.success('Task deleted');
      setConfirm(false);
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
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
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirm(true)} aria-label="Delete task">
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

        <div className="field">
          <span className="label row" style={{ gap: 6 }}>
            <Flag size={15} /> Priority
          </span>
          <Segmented
            value={form.priority}
            onChange={(v) => !readOnly && set({ priority: v })}
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            size="block"
          />
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <span className="label row between">
              <span className="row" style={{ gap: 6 }}>
                <CalendarDays size={15} /> Due
              </span>
              <span className="row tiny" style={{ gap: 6 }}>
                time <Switch checked={form.hasTime} onChange={(v) => set({ hasTime: v, due: form.due ? (v ? `${form.due.slice(0, 10)}T09:00` : form.due.slice(0, 10)) : '' })} label="Include time" />
              </span>
            </span>
            <input
              className="input"
              type={form.hasTime ? 'datetime-local' : 'date'}
              value={form.hasTime ? form.due : form.due.slice(0, 10)}
              onChange={(e) => set({ due: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div className="field">
            <span className="label row" style={{ gap: 6 }}>
              <Bell size={15} /> Remind me
            </span>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" type="datetime-local" value={form.reminderAt} onChange={(e) => set({ reminderAt: e.target.value })} disabled={readOnly} />
              {form.reminderAt && !readOnly && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => set({ reminderAt: '' })} aria-label="Remove reminder">
                  <X />
                </button>
              )}
            </div>
          </div>
          <div className="field">
            <span className="label row" style={{ gap: 6 }}>
              <Repeat size={15} /> Repeat
            </span>
            <select className="select" value={form.repeat} onChange={(e) => set({ repeat: e.target.value })} disabled={readOnly}>
              {REPEATS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label row" style={{ gap: 6 }}>
              <FolderOpen size={15} /> List
            </span>
            <select className="select" value={form.list} onChange={(e) => set({ list: e.target.value, assignee: '' })} disabled={readOnly}>
              <option value="">Inbox</option>
              {lists
                .filter((l) => l.role !== 'viewer' || l._id === form.list)
                .map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.icon} {l.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

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

        <div className="field">
          <span className="label row" style={{ gap: 6 }}>
            <ImageIcon size={15} /> Photos
          </span>
          <ImageUploader value={form.attachments} onChange={(v) => set({ attachments: v })} disabled={readOnly} />
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
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="Delete this task?" message="This also removes its checklist, photos and reminder. This can't be undone." />
    </>
  );
}
