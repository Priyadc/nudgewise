'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, TriangleAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, Skeleton } from '@/components/ui/Controls';
import { api, on } from '@/lib/client/api';
import { addDays } from '@/lib/money-math';
import { formatMoney } from '@/lib/format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const asDate = (key) => new Date(`${key}T00:00:00`);
const nice = (key) => asDate(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Month-ahead cash calendar: every bill and salary day on a calendar,
 * with the balance Pockeazy expects you to have at the end of each day.
 */
export default function CashCalendar({ currency, onAddBill }) {
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(null);
  const money = useCallback((v, compact) => formatMoney(v, currency, { compact }), [currency]);

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/money/calendar?tz=${new Date().getTimezoneOffset()}&days=35`));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('money-changed', load), [load]);

  // Pad the first week so the grid starts on Monday
  const cells = useMemo(() => {
    if (!data) return [];
    const first = asDate(data.today);
    const lead = (first.getDay() + 6) % 7;
    const pad = Array.from({ length: lead }, (_, i) => ({ key: addDays(data.today, i - lead), empty: true }));
    return [...pad, ...data.days];
  }, [data]);

  if (!data) return <Skeleton h={420} r={20} />;

  const events = data.days.filter((d) => d.bills.length || d.salary);
  const sel = data.days.find((d) => d.key === picked);
  const low = data.lowest;

  return (
    <div className="stack stack-lg">
      {data.firstShort ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad cal-alert danger">
          <TriangleAlert />
          <div>
            <b>Money may run short around {nice(data.firstShort.key)}</b>
            <div className="small muted">
              {data.firstShort.because.length ? `After ${data.firstShort.because.join(', ')}, ` : 'At your usual spending, '}
              you'd be about {money(Math.abs(data.firstShort.balance))} short. Cutting {money(Math.ceil(Math.abs(data.firstShort.balance) / Math.max(1, data.days.findIndex((d) => d.key === data.firstShort.key) + 1)))} a day from now would cover it.
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad cal-alert good">
          <Wallet />
          <div>
            <b>You're covered for the next 5 weeks</b>
            <div className="small muted">
              Lowest point: {money(low.balance)} on {nice(low.key)}.
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-3" style={{ gap: 12 }}>
        <div className="card card-pad">
          <div className="tiny muted">Balance this month so far</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{money(data.startBalance)}</div>
          <div className="tiny faint">money in − money out</div>
        </div>
        <div className="card card-pad">
          <div className="tiny muted">Usual everyday spend</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{money(data.avgDaily)}<span className="tiny muted"> /day</span></div>
          <div className="tiny faint">average of the last 30 days</div>
        </div>
        <div className="card card-pad">
          <div className="tiny muted">Next salary</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{data.salary ? money(data.salary.amount) : '—'}</div>
          <div className="tiny faint">{data.salary ? `expected around the ${ordinal(data.salary.day)}` : 'log a Salary entry to include it'}</div>
        </div>
      </div>

      <section className="card card-pad">
        <div className="card-title">
          <h3>
            <CalendarRange size={18} /> Next 5 weeks
          </h3>
          <span className="tiny faint">tap a day for details</span>
        </div>
        <div className="cal-grid" role="grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-head tiny faint">
              {w}
            </div>
          ))}
          {cells.map((d) =>
            d.empty ? (
              <div key={d.key} className="cal-cell empty" />
            ) : (
              <button
                key={d.key}
                type="button"
                className={`cal-cell ${d.key === data.today ? 'today' : ''} ${d.balance < 0 ? 'short' : ''} ${picked === d.key ? 'picked' : ''}`}
                onClick={() => setPicked(picked === d.key ? null : d.key)}
                aria-label={`${nice(d.key)}: expected balance ${money(d.balance)}`}
              >
                <span className="cal-date">{Number(d.key.slice(8))}{d.key.slice(8) === '01' ? ` ${asDate(d.key).toLocaleDateString(undefined, { month: 'short' })}` : ''}</span>
                <span className="cal-marks">
                  {d.salary > 0 && <span className="cal-mark in" title="Salary">₹+</span>}
                  {d.bills.map((b) => (
                    <span key={b._id} className={`cal-mark ${b.overdue ? 'late' : 'out'}`} title={b.name}>
                      {b.name.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="cal-bal num">{money(d.balance, true)}</span>
              </button>
            )
          )}
        </div>
        {sel && (
          <motion.div key={sel.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="cal-detail">
            <b>{nice(sel.key)}</b>
            <div className="stack stack-sm" style={{ marginTop: 8 }}>
              {sel.salary > 0 && <Line label="Salary" value={`+${money(sel.salary)}`} tone="var(--success)" />}
              {sel.bills.map((b) => (
                <Line key={b._id} label={`${b.name}${b.overdue ? ' (overdue)' : ''}${b.autopay ? ' · autopay' : ''}`} value={`−${money(b.amount)}`} tone="var(--danger)" />
              ))}
              <Line label="Everyday spending (estimate)" value={`−${money(sel.spend)}`} />
              <Line label="Expected balance at end of day" value={money(sel.balance)} tone={sel.balance < 0 ? 'var(--danger)' : undefined} bold />
            </div>
          </motion.div>
        )}
      </section>

      <section className="card card-pad">
        <div className="card-title">
          <h3>Coming up</h3>
          <button className="btn btn-ghost btn-sm" onClick={onAddBill}>
            + Add bill
          </button>
        </div>
        {events.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Nothing scheduled" text="Add rent, LIC, EMIs and subscriptions as bills, and log your salary, to see them here." />
        ) : (
          <div className="stack stack-sm">
            {events.map((d) => (
              <div key={d.key} className="row cal-event">
                <span className="cal-event-date">
                  <b>{Number(d.key.slice(8))}</b>
                  <span className="tiny">{asDate(d.key).toLocaleDateString(undefined, { month: 'short' })}</span>
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  {d.salary > 0 && <div className="small bold" style={{ color: 'var(--success)' }}>Salary +{money(d.salary)}</div>}
                  {d.bills.map((b) => (
                    <div key={b._id} className="small truncate">
                      {b.name} <span className="faint">−{money(b.amount)}</span>
                      {b.overdue && <span className="chip chip-danger" style={{ marginLeft: 6 }}>overdue</span>}
                    </div>
                  ))}
                </div>
                <span className={`num small bold ${d.balance < 0 ? 'text-danger' : ''}`} title="Expected balance after this day">
                  {money(d.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="hint" style={{ marginTop: 12 }}>
          Estimates use your usual daily spending. Marking a bill as paid or logging money updates this straight away.
        </p>
      </section>
    </div>
  );
}

function Line({ label, value, tone, bold }) {
  return (
    <div className="row between small">
      <span className={bold ? 'bold' : 'muted'}>{label}</span>
      <span className="num" style={{ color: tone, fontWeight: bold ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
