'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Confirm } from '@/components/ui/Modal';
import { Segmented, Switch } from '@/components/ui/Controls';
import CategoryIcon from '@/components/ui/CategoryIcon';
import ImageUploader from '@/components/ui/ImageUploader';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import { api, emit } from '@/lib/client/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/lib/categories';
import { parseTransaction } from '@/lib/nlp';
import { formatMoney, toDateInput } from '@/lib/format';

/** Add / edit a transaction, with voice entry and receipt photo */
export function TransactionModal({ open, onClose, txn, currency, defaultType = 'expense' }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [interim, setInterim] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      type: txn?.type || defaultType,
      amount: txn?.amount ? String(txn.amount) : '',
      category: txn?.category || (defaultType === 'income' ? 'Salary' : 'Food & Dining'),
      note: txn?.note || '',
      date: toDateInput(txn?.date || new Date()),
      method: txn?.method || 'upi',
      receipt: txn?.receipt?.url ? [txn.receipt] : [],
    });
  }, [open, txn, defaultType]);

  if (!form) return null;
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function fromVoice(text) {
    const p = parseTransaction(text);
    set({
      type: p.type,
      ...(p.amount ? { amount: String(p.amount) } : {}),
      category: p.category,
      method: p.method,
      note: p.note || form.note,
    });
  }

  async function save(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error('Enter an amount');
    setSaving(true);
    try {
      // Keep the current time for today's entries so they sort naturally
      const picked = new Date(`${form.date}T12:00:00`);
      const today = toDateInput(new Date()) === form.date;
      const body = {
        type: form.type,
        amount,
        category: form.category,
        note: form.note,
        method: form.method,
        date: today && !txn ? new Date() : picked,
        receipt: form.receipt[0] ? { url: form.receipt[0].url, publicId: form.receipt[0].publicId } : null,
      };
      if (txn) await api(`/api/transactions/${txn._id}`, { method: 'PATCH', body });
      else await api('/api/transactions', { method: 'POST', body });
      toast.success(txn ? 'Updated' : `${form.type === 'income' ? 'Income' : 'Expense'} of ${formatMoney(amount, currency)} added`);
      emit('money-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/transactions/${txn._id}`, { method: 'DELETE' });
      toast.success('Transaction deleted');
      emit('money-changed');
      setConfirm(false);
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={txn ? 'Edit transaction' : 'Add transaction'} size="lg">
        <form onSubmit={save} className="stack stack-lg">
          <div className="row between row-wrap">
            <Segmented
              value={form.type}
              onChange={(v) => set({ type: v, category: v === 'income' ? 'Salary' : 'Food & Dining' })}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
            <VoiceButton className="btn btn-soft btn-sm" title='Say e.g. "spent 250 on Swiggy"' onText={fromVoice} onInterim={setInterim} />
          </div>
          <VoiceBar text={interim} />

          <div className="stack stack-sm" style={{ alignItems: 'center' }}>
            <span className="label">Amount ({currency})</span>
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, '') })}
              autoFocus={!txn}
              aria-label="Amount"
              style={{ color: form.type === 'income' ? 'var(--success)' : undefined }}
            />
          </div>

          <div className="field">
            <span className="label">Category</span>
            <div className="cat-grid">
              {cats.map((c) => (
                <button key={c.name} type="button" className="cat-option" aria-pressed={form.category === c.name} onClick={() => set({ category: c.name })}>
                  <CategoryIcon name={c.name} size={34} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="t-date">
                Date
              </label>
              <input id="t-date" type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} max={toDateInput(new Date(Date.now() + 365 * 864e5))} />
            </div>
            <div className="field">
              <label className="label" htmlFor="t-method">
                Paid with
              </label>
              <select id="t-method" className="select" value={form.method} onChange={(e) => set({ method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="t-note">
              Note
            </label>
            <input id="t-note" className="input" value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="What was it for?" maxLength={300} />
          </div>

          <div className="field">
            <span className="label">Receipt photo</span>
            <div style={{ maxWidth: 140 }}>
              <ImageUploader single value={form.receipt} onChange={(v) => set({ receipt: v })} />
            </div>
          </div>

          <div className="row between">
            {txn ? (
              <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
                <Trash2 /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving && <Loader2 className="spin" />} {txn ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="Delete transaction?" message="This will update your totals and budgets." />
    </>
  );
}

/** Set a monthly budget for a category */
export function BudgetModal({ open, onClose, budget, used = [], currency }) {
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(budget?.category || EXPENSE_CATEGORIES.find((c) => !used.includes(c.name))?.name || 'Other');
      setLimit(budget?.limit ? String(budget.limit) : '');
    }
    // `used` is intentionally left out: it is a new array on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/budgets', { method: 'PUT', body: { category, limit: Number(limit) } });
      toast.success('Budget saved');
      emit('money-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api(`/api/budgets?category=${encodeURIComponent(budget.category)}`, { method: 'DELETE' });
    toast.success('Budget removed');
    emit('money-changed');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={budget ? `Budget · ${budget.category}` : 'New monthly budget'}>
      <form onSubmit={save} className="stack stack-lg">
        {!budget && (
          <div className="field">
            <span className="label">Category</span>
            <div className="cat-grid">
              {EXPENSE_CATEGORIES.filter((c) => !used.includes(c.name)).map((c) => (
                <button key={c.name} type="button" className="cat-option" aria-pressed={category === c.name} onClick={() => setCategory(c.name)}>
                  <CategoryIcon name={c.name} size={30} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="b-limit">
            Monthly limit ({currency})
          </label>
          <input id="b-limit" className="input" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 8000" autoFocus required />
          <span className="hint">You will see a warning at 80% and an alert when you go over.</span>
        </div>
        <div className="row between">
          {budget ? (
            <button type="button" className="btn btn-danger" onClick={remove}>
              <Trash2 /> Remove
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn-primary" disabled={saving || !limit}>
            {saving && <Loader2 className="spin" />} Save budget
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Add / edit a recurring bill (rent, EMI, insurance, subscriptions) */
export function BillModal({ open, onClose, bill, currency }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      setF({
        name: bill?.name || '',
        amount: bill?.amount ? String(bill.amount) : '',
        category: bill?.category || 'Bills & Utilities',
        frequency: bill?.frequency || 'monthly',
        dueDay: bill?.dueDay || new Date().getDate(),
        dueMonth: bill?.dueMonth || new Date().getMonth() + 1,
        remindDaysBefore: bill?.remindDaysBefore ?? 2,
        autopay: bill?.autopay || false,
      });
  }, [open, bill]);

  if (!f) return null;
  const set = (p) => setF((x) => ({ ...x, ...p }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...f, amount: Number(f.amount), dueDay: Number(f.dueDay), dueMonth: Number(f.dueMonth), remindDaysBefore: Number(f.remindDaysBefore) };
      if (bill) await api(`/api/bills/${bill._id}`, { method: 'PATCH', body });
      else await api('/api/bills', { method: 'POST', body });
      toast.success(bill ? 'Bill updated' : 'Bill added — we will remind you before it is due');
      emit('money-changed');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api(`/api/bills/${bill._id}`, { method: 'DELETE' });
    toast.success('Bill removed');
    emit('money-changed');
    onClose();
  }

  const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }));

  return (
    <Modal open={open} onClose={onClose} title={bill ? 'Edit bill' : 'Add a recurring bill'}>
      <form onSubmit={save} className="stack stack-lg">
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="bill-name">
              Name
            </label>
            <input id="bill-name" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rent, LIC premium, Netflix…" required autoFocus />
          </div>
          <div className="field">
            <label className="label" htmlFor="bill-amt">
              Amount ({currency})
            </label>
            <input id="bill-amt" className="input" inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, '') })} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="bill-cat">
              Category
            </label>
            <select id="bill-cat" className="select" value={f.category} onChange={(e) => set({ category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label">Repeats</span>
            <Segmented
              value={f.frequency}
              onChange={(v) => set({ frequency: v })}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              size="block"
            />
          </div>
          {f.frequency === 'yearly' && (
            <div className="field">
              <label className="label" htmlFor="bill-month">
                Month
              </label>
              <select id="bill-month" className="select" value={f.dueMonth} onChange={(e) => set({ dueMonth: e.target.value })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="bill-day">
              Due on day
            </label>
            <select id="bill-day" className="select" value={f.dueDay} onChange={(e) => set({ dueDay: e.target.value })}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="bill-remind">
              Remind me
            </label>
            <select id="bill-remind" className="select" value={f.remindDaysBefore} onChange={(e) => set({ remindDaysBefore: e.target.value })}>
              {[0, 1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? 'On the due date' : `${d} day${d > 1 ? 's' : ''} before`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="setting-row" style={{ borderBottom: 0 }}>
          <div>
            <div className="bold small">Autopay</div>
            <div className="tiny muted">Paid automatically — skip reminders</div>
          </div>
          <Switch checked={f.autopay} onChange={(v) => set({ autopay: v })} label="Autopay" />
        </div>
        <div className="row between">
          {bill ? (
            <button type="button" className="btn btn-danger" onClick={remove}>
              <Trash2 /> Delete
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn-primary" disabled={saving || !f.name || !f.amount}>
            {saving && <Loader2 className="spin" />} Save bill
          </button>
        </div>
      </form>
    </Modal>
  );
}
