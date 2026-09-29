'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Minus,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  CircleCheck,
  Pencil,
  CalendarClock,
  Undo2,
  UsersRound,
  CreditCard,
  Smartphone,
  WalletCards,
  Banknote,
  Landmark,
  CircleDashed,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/components/layout/AppContext';
import { SpendingDonut, TrendBars } from '@/components/finance/Charts';
import { TransactionModal, BudgetModal, BillModal } from '@/components/finance/FinanceModals';
import SplitsPanel from '@/components/finance/SplitsPanel';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { AnimatedNumber, EmptyState, Progress, Skeleton, SkeletonList, Tabs } from '@/components/ui/Controls';
import { api, on } from '@/lib/client/api';
import { getCategories, methodLabel, PAYMENT_METHODS } from '@/lib/categories';

const METHOD_ICONS = { Smartphone, CreditCard, WalletCards, Banknote, Landmark, CircleDashed, card: WalletCards };
const methodIcon = (v) => METHOD_ICONS[PAYMENT_METHODS.find((m) => m.value === v)?.icon] || (v === 'card' ? WalletCards : CircleDashed);
import { formatMoney, relativeDay } from '@/lib/format';

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shift(key, delta) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function exportCsv(rows, month) {
  const header = ['Date', 'Type', 'Category', 'My amount', 'Paid with', 'Split total', 'Split with', 'Note'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows.map((t) => [new Date(t.date).toLocaleDateString('en-CA'), t.type, t.category, t.amount, methodLabel(t.method), t.split?.total ?? '', (t.split?.people || []).map((p) => `${p.name} ${p.share}`).join('; '), t.note])]
    .map((r) => r.map(esc).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `pockeazy-transactions-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function FinanceInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const { currency, openSheet } = useApp();
  const [month, setMonth] = useState(monthKey());
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState(null);
  const [bills, setBills] = useState(null);
  const [filter, setFilter] = useState({ type: '', category: '', q: '', method: '' });
  const [txnModal, setTxnModal] = useState(null); // { txn?, type }
  const [budgetModal, setBudgetModal] = useState(null);
  const [billModal, setBillModal] = useState(null);

  const tz = typeof window !== 'undefined' ? new Date().getTimezoneOffset() : 0;
  const money = useCallback((v, compact) => formatMoney(v, currency, { compact }), [currency]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ month, tz: String(tz) });
    const tq = new URLSearchParams(qs);
    if (filter.type) tq.set('type', filter.type);
    if (filter.category) tq.set('category', filter.category);
    if (filter.q) tq.set('q', filter.q);
    if (filter.method) tq.set('method', filter.method);
    try {
      const [s, t, b] = await Promise.all([api(`/api/finance/summary?${qs}`), api(`/api/transactions?${tq}`), api('/api/bills')]);
      setSummary(s);
      setTxns(t.transactions);
      setBills(b.bills);
    } catch (err) {
      toast.error(err.message);
    }
  }, [month, tz, filter]);

  useEffect(() => {
    const t = setTimeout(load, filter.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filter.q]);
  useEffect(() => on('money-changed', load), [load]);

  const setTab = (t) => router.push(`/finance${t === 'overview' ? '' : `?tab=${t}`}`);
  const isCurrent = month === monthKey();

  async function payBill(bill) {
    try {
      const d = await api(`/api/bills/${bill._id}`, { method: 'POST', body: { action: 'pay' } });
      toast.success(`${bill.name} marked as paid`, {
        description: `Added ${money(bill.amount)} to expenses`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await api(`/api/bills/${bill._id}`, { method: 'POST', body: { action: 'unpay', period: d.paidPeriod } });
            load();
          },
        },
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const grouped = useMemo(() => {
    const g = new Map();
    (txns || []).forEach((t) => {
      const k = new Date(t.date).toDateString();
      if (!g.has(k)) g.set(k, { date: t.date, items: [], net: 0 });
      const grp = g.get(k);
      grp.items.push(t);
      grp.net += t.type === 'income' ? t.amount : -t.amount;
    });
    return [...g.values()];
  }, [txns]);

  const monthlyBills = (bills || []).filter((b) => b.active).reduce((s, b) => s + (b.frequency === 'monthly' ? b.amount : b.amount / 12), 0);

  const TxnRow = ({ t }) => (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="txn-row" onClick={() => setTxnModal({ txn: t })} role="button" tabIndex={0}>
      <CategoryIcon name={t.category} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="bold small truncate">{t.note || t.category}</div>
        <div className="tiny faint truncate">
          {t.category} · {methodLabel(t.method)}
          {t.split ? (t.split.paidBy === 'me' ? ` · split with ${t.split.people.map((p) => p.name).join(', ')}` : ` · ${t.split.paidBy} paid`) : ''}
        </div>
      </div>
      <span className="stack" style={{ gap: 0, alignItems: 'flex-end' }}>
        <span className={`num bold ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
          {t.type === 'income' ? '+' : '−'}
          {money(t.amount)}
        </span>
        {t.split && <span className="tiny faint num">of {money(t.split.total)}</span>}
      </span>
    </motion.div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Money</h1>
          <p>Know where every rupee goes — and who still owes you.</p>
        </div>
        <div className="row row-wrap">
          <div className="row card" style={{ padding: 4, gap: 2, borderRadius: 14 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMonth((m) => shift(m, -1))} aria-label="Previous month">
              <ChevronLeft />
            </button>
            <motion.span key={month} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bold small" style={{ minWidth: 118, textAlign: 'center' }}>
              {monthLabel(month)}
            </motion.span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMonth((m) => shift(m, 1))} aria-label="Next month" disabled={isCurrent}>
              <ChevronRight />
            </button>
          </div>
          <button className="btn btn-soft" onClick={() => openSheet('money', { type: 'income' })}>
            <Plus /> Received
          </button>
          <button className="btn btn-soft" onClick={() => openSheet('money', { type: 'expense', split: true })}>
            <UsersRound /> Split
          </button>
          <button className="btn btn-primary" onClick={() => openSheet('money', { type: 'expense' })}>
            <Minus /> Spent
          </button>
        </div>
      </div>

      <div className="stack stack-lg">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview', icon: LayoutGrid },
            { value: 'transactions', label: 'Transactions', icon: Receipt, count: txns?.length },
            { value: 'budgets', label: 'Budgets', icon: Target },
            { value: 'splits', label: 'Splits', icon: UsersRound },
            { value: 'bills', label: 'Bills', icon: CalendarClock, count: bills?.filter((b) => b.next.status !== 'upcoming' && !b.autopay).length },
          ]}
        />

        {!summary ? (
          <div className="stack stack-lg">
            <div className="grid grid-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} h={118} r={20} />
              ))}
            </div>
            <Skeleton h={300} r={20} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="stack stack-lg">
              {tab === 'overview' && (
                <>
                  <div className="grid grid-4">
                    {[
                      { icon: TrendingUp, label: 'Income', v: summary.income, tone: 'var(--success)' },
                      { icon: TrendingDown, label: 'Expenses', v: summary.expense, tone: 'var(--danger)' },
                      { icon: Wallet, label: 'Balance', v: summary.balance, tone: 'var(--accent)' },
                      { icon: PiggyBank, label: 'Savings rate', v: summary.savingsRate ?? 0, pct: true, tone: 'var(--info)' },
                    ].map((s) => (
                      <motion.div key={s.label} className="card stat card-hover" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="stat-label">
                          <span className="stat-icon" style={{ background: `color-mix(in oklch, ${s.tone}, transparent 86%)`, color: s.tone }}>
                            <s.icon />
                          </span>
                          {s.label}
                        </div>
                        <div className="stat-value" style={s.label === 'Balance' && s.v < 0 ? { color: 'var(--danger)' } : undefined}>
                          {s.pct ? (summary.savingsRate === null ? '—' : <><AnimatedNumber value={s.v} />%</>) : <AnimatedNumber value={s.v} format={(v) => money(v, Math.abs(v) >= 100000)} />}
                        </div>
                        <div className="stat-sub">{s.pct ? 'of income saved' : monthLabel(month)}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-2">
                    <section className="card card-pad">
                      <div className="card-title">
                        <h3>Spending by category</h3>
                      </div>
                      <SpendingDonut data={summary.byCategory} currency={currency} />
                    </section>
                    <section className="card card-pad">
                      <div className="card-title">
                        <h3>Last 6 months</h3>
                      </div>
                      <TrendBars data={summary.trend} currency={currency} />
                    </section>
                  </div>

                  {summary.byMethod?.length > 0 && (
                    <section className="card card-pad">
                      <div className="card-title">
                        <h3>
                          <WalletCards size={18} /> How you paid
                        </h3>
                        <span className="tiny faint">spending this month</span>
                      </div>
                      <div className="grid grid-3" style={{ gap: 12 }}>
                        {[...summary.byMethod]
                          .sort((a, b) => b.total - a.total)
                          .map((m) => {
                            const Icon = methodIcon(m.method);
                            return (
                              <div key={m.method} className="row" style={{ gap: 10, cursor: 'pointer' }} onClick={() => { setFilter((f) => ({ ...f, type: 'expense', method: m.method })); setTab('transactions'); }}>
                                <span className="stat-icon" style={m.method === 'credit_card' ? { background: 'color-mix(in oklch, var(--warning), transparent 86%)', color: 'var(--warning)' } : undefined}>
                                  <Icon />
                                </span>
                                <div className="grow" style={{ minWidth: 0 }}>
                                  <div className="row between small">
                                    <span className="bold">{methodLabel(m.method)}</span>
                                    <span className="num bold">{money(m.total)}</span>
                                  </div>
                                  <Progress value={m.total} max={summary.expense || 1} tone="plain" />
                                  <div className="tiny faint">{m.count} payment{m.count > 1 ? 's' : ''}{m.method === 'credit_card' ? ' · due on your card bill' : ''}</div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  )}

                  <div className="grid grid-2">
                    <section className="card card-pad">
                      <div className="card-title">
                        <h3>
                          <Target size={18} /> Budgets
                        </h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setTab('budgets')}>
                          Manage
                        </button>
                      </div>
                      {summary.budgets.length === 0 ? (
                        <p className="muted small">Set monthly limits per category to keep spending in check.</p>
                      ) : (
                        <div className="stack">
                          {summary.budgets.slice(0, 5).map((b) => (
                            <div key={b.category} className="stack stack-sm">
                              <div className="row between small">
                                <span className="row bold" style={{ gap: 8 }}>
                                  <CategoryIcon name={b.category} size={26} /> {b.category}
                                </span>
                                <span className="num muted">
                                  {money(b.spent)} / {money(b.limit)}
                                </span>
                              </div>
                              <Progress value={b.spent} max={b.limit} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="card card-pad">
                      <div className="card-title">
                        <h3>
                          <Receipt size={18} /> Recent
                        </h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setTab('transactions')}>
                          See all
                        </button>
                      </div>
                      {txns?.length ? (
                        txns.slice(0, 6).map((t) => <TxnRow key={t._id} t={t} />)
                      ) : (
                        <EmptyState icon={Receipt} title="No transactions" text="Add your first expense or income for this month." />
                      )}
                    </section>
                  </div>
                </>
              )}

              {tab === 'transactions' && (
                <>
                  <div className="row row-wrap" style={{ gap: 8 }}>
                    <div className="input-wrap grow" style={{ minWidth: 200 }}>
                      <Search />
                      <input className="input" placeholder="Search notes" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} style={{ height: 40 }} />
                    </div>
                    <select className="select" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value, category: '' }))} style={{ width: 140, height: 40 }} aria-label="Type">
                      <option value="">All types</option>
                      <option value="expense">Expenses</option>
                      <option value="income">Income</option>
                    </select>
                    <select className="select" value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))} style={{ width: 180, height: 40 }} aria-label="Category">
                      <option value="">All categories</option>
                      {(filter.type ? getCategories(filter.type) : [...getCategories('expense'), ...getCategories('income')]).map((c) => (
                        <option key={c.name + c.icon}>{c.name}</option>
                      ))}
                    </select>
                    <select className="select" value={filter.method} onChange={(e) => setFilter((f) => ({ ...f, method: e.target.value }))} style={{ width: 160, height: 40 }} aria-label="Paid with">
                      <option value="">Any payment</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-outline" onClick={() => exportCsv(txns || [], month)} disabled={!txns?.length}>
                      <Download /> CSV
                    </button>
                  </div>
                  {!txns ? (
                    <SkeletonList rows={6} h={56} />
                  ) : grouped.length === 0 ? (
                    <EmptyState icon={Receipt} title="No transactions found" text="Try another month or filter, or add one with the buttons above." />
                  ) : (
                    <div className="card card-pad" style={{ padding: 12 }}>
                      {grouped.map((g) => (
                        <div key={g.date} style={{ marginBottom: 8 }}>
                          <div className="row between tiny faint bold" style={{ padding: '8px 10px 4px' }}>
                            <span>{relativeDay(g.date)}</span>
                            <span className="num">
                              {g.net >= 0 ? '+' : '−'}
                              {money(Math.abs(g.net))}
                            </span>
                          </div>
                          <AnimatePresence initial={false}>
                            {g.items.map((t) => (
                              <TxnRow key={t._id} t={t} />
                            ))}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'budgets' && (
                <>
                  <div className="row between row-wrap">
                    <p className="muted">
                      Total budget <b className="num">{money(summary.budgets.reduce((s, b) => s + b.limit, 0))}</b> · spent{' '}
                      <b className="num">{money(summary.budgets.reduce((s, b) => s + b.spent, 0))}</b> in budgeted categories
                    </p>
                    <button className="btn btn-primary" onClick={() => setBudgetModal({})}>
                      <Plus /> New budget
                    </button>
                  </div>
                  {summary.budgets.length === 0 ? (
                    <EmptyState icon={Target} title="No budgets yet" text="Pick a category like Food or Shopping and set a monthly limit." action={<button className="btn btn-soft" onClick={() => setBudgetModal({})}><Plus /> Create a budget</button>} />
                  ) : (
                    <div className="grid grid-3">
                      {summary.budgets.map((b) => {
                        const left = b.limit - b.spent;
                        const pct = b.limit ? Math.round((b.spent / b.limit) * 100) : 0;
                        return (
                          <motion.div key={b.category} className="card card-pad card-hover stack" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ cursor: 'pointer' }} onClick={() => setBudgetModal({ budget: b })}>
                            <div className="row between">
                              <span className="row bold">
                                <CategoryIcon name={b.category} /> {b.category}
                              </span>
                              <Pencil size={15} className="faint" />
                            </div>
                            <div className="num" style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                              {money(b.spent)} <span className="small faint">/ {money(b.limit)}</span>
                            </div>
                            <Progress value={b.spent} max={b.limit} />
                            <div className={`small ${left < 0 ? 'error-text' : 'muted'}`}>
                              {left < 0 ? `Over by ${money(-left)}` : `${money(left)} left · ${pct}% used`}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === 'splits' && <SplitsPanel currency={currency} onSplit={() => openSheet('money', { type: 'expense', split: true })} />}

              {tab === 'bills' && (
                <>
                  <div className="row between row-wrap">
                    <p className="muted">
                      Recurring bills cost about <b className="num">{money(monthlyBills)}</b> per month.
                    </p>
                    <button className="btn btn-primary" onClick={() => setBillModal({})}>
                      <Plus /> Add bill
                    </button>
                  </div>
                  {!bills?.length ? (
                    <EmptyState icon={CalendarClock} title="No bills yet" text="Add rent, EMIs, insurance premiums, phone and subscriptions — we'll remind you before each due date." action={<button className="btn btn-soft" onClick={() => setBillModal({})}><Plus /> Add your first bill</button>} />
                  ) : (
                    <div className="task-list">
                      {bills.map((b) => (
                        <motion.div key={b._id} layout className="task-row" style={{ alignItems: 'center', cursor: 'default' }}>
                          <CategoryIcon name={b.category} size={42} />
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div className="task-title">{b.name}</div>
                            <div className="task-meta">
                              <span className={`chip ${b.next.status === 'overdue' ? 'chip-danger' : b.next.status === 'due-soon' ? 'chip-warning' : ''}`}>
                                <CalendarClock /> {b.next.status === 'overdue' ? `Overdue · ${relativeDay(b.next.dueDate)}` : `Due ${relativeDay(b.next.dueDate)}`}
                              </span>
                              <span className="chip">{b.frequency}</span>
                              {b.autopay && <span className="chip chip-success">autopay</span>}
                            </div>
                          </div>
                          <span className="num bold">{money(b.amount)}</span>
                          <button className="btn btn-soft btn-sm" onClick={() => payBill(b)}>
                            <CircleCheck /> <span className="hide-mobile">Mark paid</span>
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setBillModal({ bill: b })} aria-label="Edit bill">
                            <Pencil />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <p className="hint row" style={{ gap: 6 }}>
                    <Undo2 size={14} /> Marking a bill as paid adds it to your expenses automatically.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <TransactionModal open={Boolean(txnModal)} onClose={() => setTxnModal(null)} txn={txnModal?.txn} defaultType={txnModal?.type} currency={currency} />
      <BudgetModal open={Boolean(budgetModal)} onClose={() => setBudgetModal(null)} budget={budgetModal?.budget} used={summary?.budgets.map((b) => b.category) || []} currency={currency} />
      <BillModal open={Boolean(billModal)} onClose={() => setBillModal(null)} bill={billModal?.bill} currency={currency} />
    </>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<SkeletonList rows={4} />}>
      <FinanceInner />
    </Suspense>
  );
}
