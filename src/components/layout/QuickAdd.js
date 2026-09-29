'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Bell, BellRing, CalendarDays, CircleCheck, CircleCheckBig, Flag, Hash, Loader2, Repeat, Send, Wallet, FolderOpen, Sparkles, UsersRound } from 'lucide-react';
import { methodLabel } from '@/lib/categories';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Controls';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { parseTask, parseTransaction } from '@/lib/nlp';
import { api, emit } from '@/lib/client/api';
import { formatMoney, formatTime, relativeDay, PRIORITIES } from '@/lib/format';
import { useApp } from './AppContext';

const MODES = [
  { value: 'task', label: 'Task', icon: CircleCheck },
  { value: 'reminder', label: 'Reminder', icon: Bell },
  { value: 'expense', label: 'Money', icon: Wallet },
];

const TILES = [
  { kind: 'task', label: 'New task', text: 'Something to get done', icon: CircleCheckBig, color: 'var(--accent)' },
  { kind: 'reminder', label: 'Reminder', text: 'Get nudged at a time', icon: BellRing, color: 'var(--warning)' },
  { kind: 'money', props: { type: 'expense' }, label: 'Spent', text: 'Log an expense', icon: ArrowUpRight, color: 'var(--danger)' },
  { kind: 'money', props: { type: 'income' }, label: 'Received', text: 'Log income', icon: ArrowDownLeft, color: 'var(--success)' },
  { kind: 'money', props: { type: 'expense', split: true }, label: 'Split a bill', text: 'Share with friends', icon: UsersRound, color: 'var(--info)' },
];

const PLACEHOLDER = {
  task: 'e.g. Submit report friday 5pm !high #work',
  reminder: 'e.g. Call mom tomorrow at 7pm every week',
  expense: 'e.g. Spent 250 on Swiggy · Got salary 45000',
};

/** Universal quick-add: one input, natural language, works with voice. Opens with the + button or the "N" key. */
export default function QuickAdd() {
  const { quickAdd, closeQuickAdd, openSheet, lists, currency } = useApp();
  const [mode, setMode] = useState('task');
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [listId, setListId] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (quickAdd.open) {
      setMode(quickAdd.mode || 'task');
      setListId(quickAdd.listId || '');
      setText('');
    }
  }, [quickAdd]);

  const task = useMemo(() => (mode !== 'expense' ? parseTask(text) : null), [text, mode]);
  const txn = useMemo(() => (mode === 'expense' ? parseTransaction(text) : null), [text, mode]);
  const editable = lists.filter((l) => l.role !== 'viewer');
  const matchedList = task?.listName ? editable.find((l) => l.name.toLowerCase() === task.listName.toLowerCase()) : null;

  async function submit(e) {
    e?.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      if (mode === 'task') {
        if (!task.title) throw new Error('Add a title for the task');
        await api('/api/tasks', {
          method: 'POST',
          body: {
            title: task.title,
            dueDate: task.dueDate,
            hasTime: task.hasTime,
            priority: task.priority,
            tags: task.tags,
            repeat: task.repeat,
            list: matchedList?._id || listId || null,
            reminderAt: task.remind || task.hasTime ? task.dueDate : null,
          },
        });
        toast.success('Task added', { description: task.title });
        emit('tasks-changed');
      } else if (mode === 'reminder') {
        if (!task.title) throw new Error('What should we remind you about?');
        let when = task.dueDate;
        if (!when) throw new Error('Add a time, e.g. "tomorrow 9am" or "in 30 minutes"');
        if (!task.hasTime) when = new Date(new Date(when).setHours(9, 0, 0, 0));
        await api('/api/reminders', { method: 'POST', body: { title: task.title, remindAt: when, repeat: task.repeat } });
        toast.success('Reminder set', { description: `${relativeDay(when)} at ${formatTime(when)}` });
        emit('reminders-changed');
      } else {
        if (!txn.amount) throw new Error('Include an amount, e.g. "spent 250 on food"');
        await api('/api/transactions', {
          method: 'POST',
          body: { type: txn.type, amount: txn.amount, category: txn.category, note: txn.note, method: txn.method, date: new Date() },
        });
        toast.success(txn.type === 'income' ? 'Income added' : 'Expense added', { description: `${formatMoney(txn.amount, currency)} · ${txn.category}` });
        emit('money-changed');
      }
      setText('');
      closeQuickAdd();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={quickAdd.open} onClose={closeQuickAdd} title="What would you like to add?">
      <div className="stack">
        <div className="add-tiles">
          {TILES.map((t, i) => (
            <motion.button
              key={t.label}
              type="button"
              className="add-tile"
              onClick={() => openSheet(t.kind, { ...(t.props || {}), ...(t.kind === 'task' && quickAdd.listId ? { list: quickAdd.listId } : {}) })}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="stat-icon" style={{ background: `color-mix(in oklch, ${t.color}, transparent 86%)`, color: t.color }}>
                <t.icon />
              </span>
              <b>{t.label}</b>
              <span>{t.text}</span>
            </motion.button>
          ))}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <Sparkles size={16} className="faint" />
          <span className="small bold">Or just type it</span>
          <span className="tiny faint">— we'll understand</span>
        </div>
        <Segmented value={mode} onChange={setMode} options={MODES} size="block" />

        <form onSubmit={submit} className="quick-add">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER[mode]}
            aria-label="What do you want to add?"
            enterKeyHint="done"
          />
          <VoiceButton onText={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} onInterim={setInterim} className="btn btn-ghost btn-icon btn-sm" />
          <button className="btn btn-primary btn-icon btn-sm" disabled={!text.trim() || saving} aria-label="Add">
            {saving ? <Loader2 className="spin" /> : <Send />}
          </button>
        </form>
        <VoiceBar text={interim} />

        <AnimatePresence mode="popLayout">
          {text.trim() && (
            <motion.div key={mode} className="parse-preview" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {mode !== 'expense' && task && (
                <>
                  {task.dueDate && (
                    <span className="chip chip-accent">
                      <CalendarDays /> {relativeDay(task.dueDate)}
                      {task.hasTime ? ` · ${formatTime(task.dueDate)}` : ''}
                    </span>
                  )}
                  {task.priority > 0 && (
                    <span className="chip" style={{ color: PRIORITIES[task.priority].color }}>
                      <Flag /> {PRIORITIES[task.priority].label}
                    </span>
                  )}
                  {task.repeat !== 'none' && (
                    <span className="chip chip-info">
                      <Repeat /> {task.repeat}
                    </span>
                  )}
                  {task.tags.map((t) => (
                    <span key={t} className="chip">
                      <Hash /> {t}
                    </span>
                  ))}
                  {matchedList && (
                    <span className="chip">
                      {matchedList.icon} {matchedList.name}
                    </span>
                  )}
                  {mode === 'task' && (task.remind || task.hasTime) && (
                    <span className="chip chip-warning">
                      <Bell /> reminder
                    </span>
                  )}
                </>
              )}
              {mode === 'expense' && txn && (
                <>
                  <span className={`chip ${txn.type === 'income' ? 'chip-success' : 'chip-accent'}`}>
                    {txn.type === 'income' ? '+ Income' : '− Expense'}
                  </span>
                  {txn.amount ? <span className="chip bold num">{formatMoney(txn.amount, currency)}</span> : <span className="chip chip-danger">amount?</span>}
                  <span className="chip" style={{ paddingLeft: 3 }}>
                    <CategoryIcon name={txn.category} size={18} /> {txn.category}
                  </span>
                  <span className="chip">{methodLabel(txn.method)}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'task' && !matchedList && (
          <div className="row" style={{ gap: 8 }}>
            <FolderOpen size={17} className="faint" />
            <select className="select" value={listId} onChange={(e) => setListId(e.target.value)} style={{ height: 38 }} aria-label="List">
              <option value="">No list</option>
              {editable.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.icon} {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="hint">
          Try <span className="kbd">!high</span> <span className="kbd">#tag</span> <span className="kbd">@List</span> <span className="kbd">every week</span> or{' '}
          <span className="kbd">paid 400 by credit card</span>. Press <span className="kbd">N</span> anywhere to open this.
        </p>
      </div>
    </Modal>
  );
}
