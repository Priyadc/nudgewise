'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, PiggyBank, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Controls';
import { useApp } from '@/components/layout/AppContext';
import { api, emit } from '@/lib/client/api';
import { celebrate } from '@/lib/client/celebrate';
import { computeSafeToSpend } from '@/lib/money-math';
import { formatMoney } from '@/lib/format';

const fmtDay = (key) => new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const STATUS = {
  good: { tone: 'var(--success)', text: (p, m) => `You're on track. Spend up to ${m(p.perDay)} a day and you'll still hit your savings.` },
  tight: { tone: 'var(--warning)', text: () => 'Getting close to today’s limit — maybe skip the extra coffee.' },
  'over-today': { tone: 'var(--danger)', text: (p, m) => `You're ${m(-p.leftToday)} over today. Spend a little less over the next few days and you'll catch up.` },
  over: { tone: 'var(--danger)', text: () => 'Bills and spending have used up this month’s money. Try lowering your savings % or pausing extra spends.' },
};

/** Dashboard card: how much can I spend today without missing bills or savings? */
export function SafeToSpendCard({ plan, variants }) {
  const { currency, openSheet } = useApp();
  if (!plan) return null;
  const money = (v) => formatMoney(v, currency);

  if (plan.status === 'no-income') {
    return (
      <motion.section variants={variants} className="card card-pad safe-card">
        <div className="card-title">
          <h3>
            <ShieldCheck size={18} /> Safe to spend today
          </h3>
        </div>
        <p className="muted small" style={{ marginBottom: 14 }}>
          Add this month's salary and Pockeazy will work out how much you can spend each day after rent, bills and savings.
        </p>
        <div className="row row-wrap" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => openSheet('money', { type: 'income' })}>
            <Wallet /> Add salary
          </button>
          <button className="btn btn-soft btn-sm" onClick={() => openSheet('salary')}>
            <Sparkles /> Plan with expected salary
          </button>
        </div>
      </motion.section>
    );
  }

  const st = STATUS[plan.status] || STATUS.good;
  const shown = Math.max(0, plan.leftToday);
  return (
    <motion.section variants={variants} className="card card-pad safe-card" style={{ '--safe': st.tone }}>
      <div className="card-title">
        <h3>
          <ShieldCheck size={18} /> Safe to spend today
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={() => openSheet('salary')}>
          <PiggyBank /> Salary plan
        </button>
      </div>
      <div className="safe-main">
        <div>
          <div className="safe-amount num">{money(shown)}</div>
          <div className="tiny muted">
            left of {money(plan.perDay)} for today · {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left this month
          </div>
        </div>
        <div className="safe-bar grow">
          <Progress value={plan.spentToday} max={plan.perDay || 1} />
          <div className="tiny faint" style={{ marginTop: 6 }}>
            Spent today: <b className="num">{money(plan.spentToday)}</b>
          </div>
        </div>
      </div>
      <p className="small" style={{ color: st.tone, fontWeight: 600, margin: '12px 0' }}>{st.text(plan, money)}</p>
      <div className="safe-breakdown">
        <div>
          <span className="tiny muted">Money in</span>
          <b className="num">{money(plan.income)}</b>
        </div>
        <div>
          <span className="tiny muted">Bills still to pay</span>
          <b className="num">{money(plan.billsLeftTotal)}</b>
        </div>
        <div>
          <span className="tiny muted">Saving ({plan.savePercent}%)</span>
          <b className="num">{money(plan.saveTarget)}</b>
        </div>
        <div>
          <span className="tiny muted">Spent this month</span>
          <b className="num">{money(plan.spentBeforeToday + plan.spentToday)}</b>
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Salary-day plan: bills first, then savings, then what's free to spend.
 * Opens automatically after logging a Salary entry, or from the dashboard.
 */
export function SalaryPlanModal({ open, onClose, amount }) {
  const { currency, reloadUser } = useApp();
  const [plan, setPlan] = useState(null);
  const [goals, setGoals] = useState([]);
  const [salary, setSalary] = useState('');
  const [pct, setPct] = useState(20);
  const [goalId, setGoalId] = useState('');
  const [saving, setSaving] = useState(false);
  const money = (v) => formatMoney(v, currency);

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    Promise.all([api(`/api/money/plan?tz=${new Date().getTimezoneOffset()}`), api('/api/goals').catch(() => ({ goals: [] }))])
      .then(([p, g]) => {
        setPlan(p.plan);
        setGoals((g.goals || []).filter((x) => !x.reachedAt));
        setPct(p.plan.savePercent ?? 20);
        setSalary(String(amount || p.plan.salaryThisMonth || p.plan.expectedIncome || p.plan.incomeActual || ''));
      })
      .catch((err) => toast.error(err.message));
  }, [open, amount]);

  const n = Number(salary) || 0;
  const calc = useMemo(() => {
    if (!plan) return null;
    // Income already logged this month that isn't salary still counts
    const otherIncome = Math.max(0, plan.incomeActual - plan.salaryThisMonth);
    return computeSafeToSpend({
      incomeActual: plan.incomeActual,
      expectedIncome: n + otherIncome,
      savePercent: pct,
      savedLogged: plan.savedLogged,
      spentBeforeToday: plan.spentBeforeToday,
      spentToday: plan.spentToday,
      billsLeftTotal: plan.billsLeftTotal,
      daysLeft: plan.daysLeft,
    });
  }, [plan, n, pct]);

  async function lockIn() {
    if (!n) return toast.error('Enter your salary amount');
    setSaving(true);
    try {
      await api('/api/user', { method: 'PATCH', body: { settings: { monthlyIncome: n, savePercent: pct } } });
      const goal = goals.find((g) => g._id === goalId);
      if (goal && calc.saveStillToPut > 0) {
        const d = await api(`/api/goals/${goal._id}`, { method: 'POST', body: { action: 'add', amount: calc.saveStillToPut } });
        if (d.justReached) celebrate({ title: `${goal.emoji} ${goal.name} reached!`, sub: 'Your salary plan just finished this goal.' });
      }
      toast.success('Salary plan saved', { description: `${money(calc.perDay)} a day is safe to spend` });
      reloadUser();
      emit('money-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const parts = calc
    ? [
        { key: 'bills', label: 'Bills', value: plan.billsLeftTotal, color: 'var(--warning)' },
        { key: 'save', label: 'Savings', value: calc.saveTarget, color: 'var(--success)' },
        { key: 'spent', label: 'Already spent', value: plan.spentBeforeToday + plan.spentToday, color: 'var(--info)' },
        { key: 'free', label: 'Free to spend', value: Math.max(0, calc.spendable), color: 'var(--accent)' },
      ]
    : [];
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="💰 Salary-day plan"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Later
          </button>
          <button className="btn btn-primary" onClick={lockIn} disabled={!calc || saving || !n}>
            {saving ? <Loader2 className="spin" /> : <ArrowRight />} Lock in plan
          </button>
        </>
      }
    >
      {!calc ? (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Loader2 className="spin" />
        </div>
      ) : (
        <div className="stack stack-lg">
          <div className="field">
            <label className="label" htmlFor="sp-salary">
              Salary this month
            </label>
            <input id="sp-salary" className="input num" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 45000" />
          </div>

          <div className="plan-bar" role="img" aria-label="How your salary is split">
            {parts.map((p) =>
              p.value > 0 ? <motion.span key={p.key} style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ duration: 0.6 }} /> : null
            )}
          </div>
          <div className="plan-legend">
            {parts.map((p) => (
              <div key={p.key} className="row" style={{ gap: 8 }}>
                <span className="dot" style={{ background: p.color }} />
                <span className="small grow">{p.label}</span>
                <b className="num small">{money(p.value)}</b>
              </div>
            ))}
          </div>

          <div className="field">
            <div className="row between">
              <span className="label">Put aside</span>
              <b className="num">
                {pct}% · {money(calc.saveTarget)}
              </b>
            </div>
            <input type="range" min={0} max={60} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="range" aria-label="Savings percentage" />
            <div className="tiny faint">Tip: 20% is a healthy start. Even 10% adds up to more than a month's salary in a year.</div>
          </div>

          {goals.length > 0 && (
            <div className="field">
              <label className="label" htmlFor="sp-goal">
                Move savings into a goal
              </label>
              <select id="sp-goal" className="select" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">Just keep it aside</option>
                {goals.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.emoji} {g.name} ({money(g.saved)} of {money(g.target)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {plan.billsLeft.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>
                Bills still to pay this month
              </div>
              <div className="stack stack-sm">
                {plan.billsLeft.map((b) => (
                  <div key={`${b._id}-${b.key}`} className="row small">
                    <span className="grow truncate">{b.name}</span>
                    <span className={`chip ${b.overdue ? 'chip-danger' : ''}`}>{b.overdue ? 'Overdue' : fmtDay(b.key)}</span>
                    <b className="num" style={{ minWidth: 80, textAlign: 'right' }}>
                      {money(b.amount)}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="plan-result" style={{ '--safe': calc.perDay > 0 ? 'var(--success)' : 'var(--danger)' }}>
            <div className="tiny muted">Safe to spend every day until the month ends</div>
            <div className="safe-amount num">{money(calc.perDay)}</div>
            <div className="tiny muted">
              {money(Math.max(0, calc.spendable))} free over {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
