'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CalendarDays, CircleDashed, CreditCard, Equal, Landmark, Loader2, Scale, SlidersHorizontal, Smartphone, Trash2, UserPlus, UsersRound, WalletCards, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { deleteWithUndo } from '@/lib/client/undo';
import { guessEntry } from '@/lib/client/guess';
import { Segmented, Switch } from '@/components/ui/Controls';
import { ChipGroup, PickLabel } from '@/components/ui/Chips';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import { api, emit } from '@/lib/client/api';
import { getCategories, PAYMENT_METHODS } from '@/lib/categories';
import CategoryPicker from './CategoryPicker';
import { parseTransaction } from '@/lib/nlp';
import { equalShares, round2 } from '@/lib/splits';
import { formatMoney, toDateInput } from '@/lib/format';

const METHOD_ICONS = { Smartphone, CreditCard, WalletCards, Banknote, Landmark, CircleDashed };
const METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label, icon: METHOD_ICONS[m.icon] }));

function dayOptions() {
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  return [
    { value: toDateInput(today), label: 'Today' },
    { value: toDateInput(yesterday), label: 'Yesterday' },
    { value: 'pick', label: 'Pick a date', icon: CalendarDays },
  ];
}

const blankPerson = () => ({ name: '', share: '', settled: false });

function splitFromTxn(txn) {
  const s = txn?.split;
  if (!s) return { on: false, people: [blankPerson()], mode: 'equal', paidBy: 'me', meSettled: false };
  const people = s.people.map((p) => ({ name: p.name, share: String(p.share), settled: Boolean(p.settled) }));
  const { each } = equalShares(s.total, people.length);
  const equal = people.every((p) => Math.abs(Number(p.share) - each) < 0.01);
  return { on: true, people, mode: equal ? 'equal' : 'custom', paidBy: s.paidBy || 'me', meSettled: Boolean(s.meSettled) };
}

/** Hide an entry now, offer Undo, and delete it for real a few seconds later */
export function deleteTransaction(txn, currency) {
  deleteWithUndo({
    label: 'Entry deleted',
    description: `${txn.note || txn.category} · ${formatMoney(txn.amount, currency)}`,
    hide: () => emit('money-hide', txn._id),
    restore: () => emit('money-changed'),
    commit: async () => {
      await api(`/api/transactions/${txn._id}`, { method: 'DELETE', keepalive: true });
      emit('money-changed');
    },
  });
}

// What you usually pick for a note — loaded once per session
let memoryCache = null;

/** Add / edit a transaction — tap-first, with voice entry, payment method and bill splitting */
export function TransactionModal({ open, onClose, txn, currency, defaultType = 'expense', startSplit = false, preset = null }) {
  const [form, setForm] = useState(null);
  const [split, setSplit] = useState(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [friends, setFriends] = useState([]);
  const [saving, setSaving] = useState(false);
  const [interim, setInterim] = useState('');
  const [memory, setMemory] = useState(memoryCache || []);

  useEffect(() => {
    if (!open) return;
    const type = txn?.type || defaultType;
    setForm({
      type,
      amount: txn ? String(txn.split?.total || txn.amount) : '',
      category: txn?.category || (type === 'income' ? 'Salary' : 'Food & Dining'),
      note: txn?.note || '',
      date: toDateInput(txn?.date || new Date()),
      method: txn?.method || 'upi',
      catTouched: Boolean(txn || preset?.category),
      methodTouched: Boolean(txn || preset?.method),
      autoPicked: null,
      ...(txn ? {} : preset || {}),
    });
    const sp = splitFromTxn(txn);
    if (!txn && startSplit && type === 'expense') sp.on = true;
    setSplit(sp);
    setPickingDate(false);
    if (!txn && !memoryCache) {
      api('/api/transactions/memory')
        .then((d) => {
          memoryCache = d.memory;
          setMemory(d.memory);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, txn, defaultType, startSplit]);

  // Names you've split with before, for quick suggestions
  useEffect(() => {
    if (!open || !split?.on || friends.length) return;
    api('/api/splits')
      .then((d) => setFriends(d.people.map((p) => p.name)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, split?.on]);

  const shares = useMemo(() => {
    if (!split || !form) return { people: [], mine: 0, othersTotal: 0 };
    const total = Number(form.amount) || 0;
    const named = split.people.filter((p) => p.name.trim());
    if (split.mode === 'equal') {
      const { each, mine } = equalShares(total, Math.max(named.length, 1));
      return { people: named.map((p) => ({ ...p, share: named.length ? each : 0 })), mine: named.length ? mine : total, othersTotal: round2(total - (named.length ? mine : total)) };
    }
    const people = named.map((p) => ({ ...p, share: round2(p.share) }));
    const othersTotal = round2(people.reduce((s, p) => s + p.share, 0));
    return { people, mine: round2(total - othersTotal), othersTotal };
  }, [split, form]);

  if (!form || !split) return null;
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const setS = (p) => setSplit((x) => ({ ...x, ...p }));
  const setPerson = (i, p) => setS({ people: split.people.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const splitting = split.on && form.type === 'expense';
  const days = dayOptions();
  const dayValue = !pickingDate && days.some((d) => d.value === form.date) ? form.date : 'pick';
  const payerOptions = [{ value: 'me', label: 'Me' }, ...shares.people.map((p) => ({ value: p.name.trim(), label: p.name.trim() }))];
  const paidBy = payerOptions.some((o) => o.value.toLowerCase() === split.paidBy.toLowerCase()) ? split.paidBy : 'me';

  function onNote(value) {
    const patch = { note: value };
    const g = guessEntry(value, form.type, memory);
    if (g && !form.catTouched) {
      patch.category = g.category;
      patch.autoPicked = g.source;
    }
    if (g?.method && !form.methodTouched) patch.method = g.method;
    set(patch);
  }

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

  function splitError() {
    const names = shares.people.map((p) => p.name.trim().toLowerCase());
    if (!names.length) return 'Add at least one person to split with';
    if (names.some((n) => n === 'me' || n === 'you')) return 'Use their real name — "me" is you';
    if (new Set(names).size !== names.length) return 'Each person needs a different name';
    if (split.mode === 'custom' && shares.mine < 0) return 'Their shares add up to more than the bill';
    return null;
  }

  async function save(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error(splitting ? 'Enter the total bill' : 'Enter an amount');
    if (splitting) {
      const err = splitError();
      if (err) return toast.error(err);
    }
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
        split: splitting
          ? {
              total: amount,
              paidBy,
              meSettled: paidBy === 'me' ? false : split.meSettled,
              people: shares.people.map((p) => ({ name: p.name.trim(), share: p.share, settled: paidBy === 'me' ? p.settled : false })),
            }
          : null,
      };
      if (txn) await api(`/api/transactions/${txn._id}`, { method: 'PATCH', body });
      else await api('/api/transactions', { method: 'POST', body });
      if (splitting) {
        const who = shares.people.map((p) => p.name.trim()).join(', ');
        toast.success(txn ? 'Split updated' : 'Bill split', {
          description: paidBy === 'me' ? `${who} owe${shares.people.length > 1 ? '' : 's'} you ${formatMoney(shares.othersTotal, currency)}` : `You owe ${paidBy} ${formatMoney(shares.mine, currency)}`,
        });
      } else toast.success(txn ? 'Updated' : `${form.type === 'income' ? 'Income' : 'Expense'} of ${formatMoney(amount, currency)} added`);
      emit('money-changed');
      onClose();
      if (!txn && form.type === 'income' && form.category === 'Salary') emit('salary-logged', amount);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    onClose();
    deleteTransaction(txn, currency);
  }

  const title = txn ? 'Edit entry' : splitting ? 'Split a bill' : form.type === 'income' ? 'Money in' : 'Money out';

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} size="lg">
        <form onSubmit={save} className="stack stack-lg">
          <div className="row between row-wrap">
            <Segmented
              value={form.type}
              onChange={(v) => set({ type: v, category: v === 'income' ? 'Salary' : 'Food & Dining', catTouched: false, autoPicked: null })}
              options={[
                { value: 'expense', label: 'Spent' },
                { value: 'income', label: 'Received' },
              ]}
            />
            <VoiceButton className="btn btn-soft btn-sm" title='Say e.g. "spent 250 on Swiggy by credit card"' onText={fromVoice} onInterim={setInterim} />
          </div>
          <VoiceBar text={interim} />

          <div className="stack stack-sm" style={{ alignItems: 'center' }}>
            <span className="label">{splitting ? `Total bill (${currency})` : `How much? (${currency})`}</span>
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
            {splitting && Number(form.amount) > 0 && shares.people.length > 0 && (
              <span className="chip chip-accent">Your share {formatMoney(Math.max(0, shares.mine), currency)}</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="t-note">
              {form.type === 'income' ? 'What was it?' : 'What was it for?'} <span className="faint">(optional)</span>
            </label>
            <input id="t-note" className="input" value={form.note} onChange={(e) => onNote(e.target.value)} placeholder={splitting ? 'Dinner at Toit, Goa trip cab…' : form.type === 'income' ? 'Salary, freelance project…' : 'Swiggy, petrol, groceries…'} maxLength={300} />
          </div>

          <div className="field">
            <PickLabel
              aside={
                form.autoPicked && (
                  <span className="tiny" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    ✨ {form.autoPicked === 'history' ? 'picked from your past entries' : 'picked from the note'}
                  </span>
                )
              }
            >
              Category
            </PickLabel>
            <CategoryPicker type={form.type} value={form.category} onChange={(name) => set({ category: name, catTouched: true, autoPicked: null })} />
          </div>

          <div>
            <PickLabel icon={WalletCards}>{form.type === 'income' ? 'Received via' : 'Paid with'}</PickLabel>
            <ChipGroup options={METHOD_OPTIONS} value={form.method === 'card' ? 'debit_card' : form.method} onChange={(v) => set({ method: v, methodTouched: true })} ariaLabel="Payment method" />
          </div>

          <div>
            <PickLabel icon={CalendarDays}>When</PickLabel>
            <ChipGroup
              options={days}
              value={dayValue}
              onChange={(v) => {
                setPickingDate(v === 'pick');
                if (v !== 'pick') set({ date: v });
              }}
              ariaLabel="Date"
            />
            {dayValue === 'pick' && (
              <input type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} max={toDateInput(new Date(Date.now() + 365 * 864e5))} style={{ marginTop: 8, maxWidth: 220 }} aria-label="Pick a date" />
            )}
          </div>

          {form.type === 'expense' && (
            <div className="card" style={{ padding: 14, boxShadow: 'none', background: splitting ? 'var(--accent-soft)' : undefined }}>
              <div className="row between">
                <div>
                  <div className="bold small row" style={{ gap: 6 }}>
                    <UsersRound size={16} /> Split this bill
                  </div>
                  <div className="tiny muted">Share it with friends — we'll track who owes whom.</div>
                </div>
                <Switch checked={split.on} onChange={(v) => setS({ on: v })} label="Split this bill" />
              </div>

              <AnimatePresence initial={false}>
                {splitting && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="stack" style={{ paddingTop: 14 }}>
                      <ChipGroup
                        options={[
                          { value: 'equal', label: 'Split equally', icon: Equal },
                          { value: 'custom', label: 'Custom amounts', icon: SlidersHorizontal },
                        ]}
                        value={split.mode}
                        onChange={(v) => {
                          if (v === 'custom' && split.mode === 'equal') {
                            setS({ mode: v, people: split.people.map((p) => ({ ...p, share: p.name.trim() ? String(shares.people.find((x) => x.name === p.name)?.share ?? '') : '' })) });
                          } else setS({ mode: v });
                        }}
                        ariaLabel="How to split"
                      />

                      <div className="split-person">
                        <span className="avatar avatar-sm" style={{ background: 'var(--accent)', color: '#fff' }}>
                          Me
                        </span>
                        <span className="grow small bold">You</span>
                        <span className="num small bold">{formatMoney(Math.max(0, shares.mine), currency)}</span>
                      </div>

                      {split.people.map((p, i) => (
                        <div key={i} className="split-person">
                          <input
                            className="input grow"
                            list="split-friends"
                            value={p.name}
                            onChange={(e) => setPerson(i, { name: e.target.value })}
                            placeholder={i === 0 ? 'Friend’s name' : 'Another person'}
                            maxLength={40}
                            aria-label={`Person ${i + 1} name`}
                            style={{ height: 40 }}
                          />
                          {split.mode === 'custom' ? (
                            <input className="input num" inputMode="decimal" value={p.share} onChange={(e) => setPerson(i, { share: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" aria-label={`${p.name || 'Person'}'s share`} style={{ height: 40, width: 100 }} />
                          ) : (
                            <span className="num small muted" style={{ minWidth: 70, textAlign: 'right' }}>
                              {p.name.trim() ? formatMoney(shares.people.find((x) => x.name === p.name)?.share || 0, currency) : '—'}
                            </span>
                          )}
                          {p.settled && <span className="chip chip-success">paid</span>}
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setS({ people: split.people.length > 1 ? split.people.filter((_, j) => j !== i) : [blankPerson()] })} aria-label="Remove person">
                            <X />
                          </button>
                        </div>
                      ))}
                      <datalist id="split-friends">
                        {friends.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                      {split.people.length < 20 && (
                        <button type="button" className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setS({ people: [...split.people, blankPerson()] })}>
                          <UserPlus /> Add a person
                        </button>
                      )}

                      {shares.people.length > 0 && (
                        <div>
                          <PickLabel>Who paid the bill?</PickLabel>
                          <ChipGroup options={payerOptions} value={paidBy} onChange={(v) => setS({ paidBy: v })} ariaLabel="Who paid" />
                        </div>
                      )}

                      {shares.people.length > 0 && Number(form.amount) > 0 && (
                        <div className="summary-line" style={shares.mine < 0 ? { background: 'var(--danger-soft)' } : undefined}>
                          <Scale />
                          <span>
                            {shares.mine < 0
                              ? `Their shares are ${formatMoney(-shares.mine, currency)} more than the bill`
                              : paidBy === 'me'
                                ? `You paid — ${shares.people.map((x) => `${x.name.trim()} owes you ${formatMoney(x.share, currency)}`).join(', ')}. Only your ${formatMoney(shares.mine, currency)} counts as your spending.`
                                : `${paidBy} paid — you owe them ${formatMoney(shares.mine, currency)}.`}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="row between">
            {txn ? (
              <button type="button" className="btn btn-danger" onClick={remove}>
                <Trash2 /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary btn-lg" disabled={saving}>
                {saving && <Loader2 className="spin" />} {txn ? 'Save' : splitting ? 'Split it' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
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
      setCategory(budget?.category || getCategories('expense').find((c) => !used.includes(c.name))?.name || 'Other');
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
            <CategoryPicker type="expense" value={category} onChange={setCategory} exclude={used} />
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
              {getCategories('expense').map((c) => (
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
