'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Minus, Pencil, PiggyBank, Plus, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, SkeletonList } from '@/components/ui/Controls';
import { api, emit, on } from '@/lib/client/api';
import { deleteWithUndo } from '@/lib/client/undo';
import { celebrate } from '@/lib/client/celebrate';
import { formatMoney } from '@/lib/format';

const EMOJIS = ['🎯', '✈️', '🏖️', '🏠', '🚗', '🏍️', '💻', '📱', '💍', '🎓', '🏥', '🎁', '🛟', '🐶', '📈', '💰'];

const EXAMPLES = [
  { name: 'Emergency fund', emoji: '🛟', target: 50000 },
  { name: 'Goa trip', emoji: '🏖️', target: 20000 },
  { name: 'New laptop', emoji: '💻', target: 60000 },
];

function monthsUntil(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

/** Create / edit a savings goal */
export function GoalModal({ open, onClose, goal, preset, currency }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      name: goal?.name || preset?.name || '',
      emoji: goal?.emoji || preset?.emoji || '🎯',
      target: goal?.target ? String(goal.target) : preset?.target ? String(preset.target) : '',
      deadline: goal?.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
    });
  }, [open, goal, preset]);

  if (!f) return null;
  const set = (p) => setF((x) => ({ ...x, ...p }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: f.name, emoji: f.emoji, target: Number(f.target), deadline: f.deadline ? new Date(`${f.deadline}T12:00:00`) : null };
      if (goal) await api(`/api/goals/${goal._id}`, { method: 'PATCH', body });
      else await api('/api/goals', { method: 'POST', body });
      toast.success(goal ? 'Goal updated' : 'Goal created — every rupee counts!');
      emit('goals-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const months = monthsUntil(f.deadline);
  const perMonth = months && Number(f.target) ? Math.ceil((Number(f.target) - (goal?.saved || 0)) / months) : null;

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New savings goal'}>
      <form onSubmit={save} className="stack stack-lg">
        <div className="field">
          <label className="label" htmlFor="g-name">
            What are you saving for?
          </label>
          <input id="g-name" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Goa trip, new phone, emergency fund…" maxLength={60} autoFocus required />
        </div>
        <div className="field">
          <span className="label">Pick an icon</span>
          <div className="chip-row">
            {EMOJIS.map((e) => (
              <button key={e} type="button" className="pick-chip" aria-pressed={f.emoji === e} onClick={() => set({ emoji: e })} style={{ padding: '0 10px', fontSize: 18 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="g-target">
              Target ({currency})
            </label>
            <input id="g-target" className="input" inputMode="decimal" value={f.target} onChange={(e) => set({ target: e.target.value.replace(/[^\d.]/g, '') })} placeholder="20000" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="g-date">
              By when? <span className="faint">(optional)</span>
            </label>
            <input id="g-date" type="date" className="input" value={f.deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ deadline: e.target.value })} />
          </div>
        </div>
        {perMonth > 0 && (
          <div className="summary-line">
            <PiggyBank />
            <span>
              Save about <b>{formatMoney(perMonth, currency)}</b> a month to get there on time.
            </span>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || !f.name.trim() || !Number(f.target)}>
            {saving && <Loader2 className="spin" />} {goal ? 'Save' : 'Create goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GoalCard({ goal, currency, onEdit, onAdd, onDelete }) {
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
  const left = Math.max(0, goal.target - goal.saved);
  const months = monthsUntil(goal.deadline);
  const reached = goal.saved >= goal.target;
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const step = goal.target >= 50000 ? [1000, 5000] : goal.target >= 10000 ? [500, 1000] : [100, 500];

  return (
    <motion.div layout className={`card card-pad goal-card ${reached ? 'reached' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12 }}>
          <span className="goal-emoji">{goal.emoji || '🎯'}</span>
          <div>
            <div className="bold">{goal.name}</div>
            <div className="tiny muted">
              {reached ? `Reached ${goal.reachedAt ? new Date(goal.reachedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''} 🎉` : goal.deadline ? `By ${new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : 'No deadline'}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} aria-label="Edit goal" data-tip="Edit">
            <Pencil />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm task-delete" onClick={onDelete} aria-label="Delete goal" data-tip="Delete">
            <Trash2 />
          </button>
        </div>
      </div>

      <div className="goal-amount num">
        {formatMoney(goal.saved, currency)} <span className="small faint">/ {formatMoney(goal.target, currency)}</span>
      </div>
      <div className="goal-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <div className="row between tiny muted">
        <span className="bold" style={{ color: reached ? 'var(--success)' : 'var(--accent)' }}>{pct}%</span>
        <span>{reached ? 'Goal complete!' : `${formatMoney(left, currency)} to go${months ? ` · ${formatMoney(Math.ceil(left / months), currency)}/month` : ''}`}</span>
      </div>

      {!reached && (
        <div className="chip-row" style={{ marginTop: 4 }}>
          {step.map((a) => (
            <button key={a} className="pick-chip" onClick={() => onAdd(a)}>
              <Plus /> {formatMoney(a, currency)}
            </button>
          ))}
          <button className="pick-chip" onClick={() => setShowCustom((s) => !s)} aria-expanded={showCustom}>
            Other amount
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {showCustom && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(custom);
              if (!v) return;
              onAdd(v);
              setCustom('');
              setShowCustom(false);
            }}
          >
            <div className="row" style={{ gap: 6, paddingTop: 8 }}>
              <input className="input" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Amount" style={{ height: 38 }} autoFocus />
              <button className="btn btn-primary btn-sm">Add</button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Take money out"
                onClick={() => {
                  const v = Number(custom);
                  if (v) onAdd(-v);
                  setCustom('');
                  setShowCustom(false);
                }}
              >
                <Minus /> Take out
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Money → Goals tab */
export default function GoalsPanel({ currency }) {
  const [goals, setGoals] = useState(null);
  const [modal, setModal] = useState(null); // { goal?, preset? }

  const load = useCallback(async () => {
    try {
      const d = await api('/api/goals');
      setGoals(d.goals);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('goals-changed', load), [load]);

  async function add(goal, amount) {
    try {
      const d = await api(`/api/goals/${goal._id}`, { method: 'POST', body: { action: 'add', amount } });
      setGoals((gs) => gs.map((g) => (g._id === goal._id ? d.goal : g)));
      if (amount < 0) {
        toast(`${formatMoney(-amount, currency)} taken out of ${goal.name}`);
      } else if (d.justReached) {
        celebrate({ title: `You did it! ${goal.emoji || '🎯'}`, sub: `${goal.name} is fully saved — ${formatMoney(d.goal.target, currency)}!`, button: 'Amazing!' });
      } else {
        const pct = Math.min(100, Math.round((d.goal.saved / d.goal.target) * 100));
        celebrate({ title: `+${formatMoney(amount, currency)} saved! 💰`, sub: `${goal.name} is now ${pct}% there. Keep going!` });
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  function remove(goal) {
    deleteWithUndo({
      label: 'Goal deleted',
      description: goal.name,
      hide: () => setGoals((gs) => gs.filter((g) => g._id !== goal._id)),
      restore: load,
      commit: () => api(`/api/goals/${goal._id}`, { method: 'DELETE', keepalive: true }),
    });
  }

  const totalSaved = (goals || []).reduce((s, g) => s + g.saved, 0);

  return (
    <div className="stack stack-lg">
      <div className="row between row-wrap">
        <p className="muted">
          {goals?.length ? (
            <>
              You've put aside <b className="num">{formatMoney(totalSaved, currency)}</b> across {goals.length} goal{goals.length > 1 ? 's' : ''}.
            </>
          ) : (
            'Save up for something that matters — a little at a time.'
          )}
        </p>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus /> New goal
        </button>
      </div>

      {!goals ? (
        <SkeletonList rows={3} h={120} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No savings goals yet"
          text="Pick something you're saving for and watch the bar fill up."
          action={
            <div className="chip-row" style={{ justifyContent: 'center' }}>
              {EXAMPLES.map((ex) => (
                <button key={ex.name} className="pick-chip" onClick={() => setModal({ preset: ex })}>
                  {ex.emoji} {ex.name}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <div className="grid grid-3">
          <AnimatePresence>
            {goals.map((g) => (
              <GoalCard key={g._id} goal={g} currency={currency} onEdit={() => setModal({ goal: g })} onAdd={(a) => add(g, a)} onDelete={() => remove(g)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <GoalModal open={Boolean(modal)} onClose={() => setModal(null)} goal={modal?.goal} preset={modal?.preset} currency={currency} />
    </div>
  );
}
