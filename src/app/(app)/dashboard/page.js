'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CircleCheck,
  Flame,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  Sparkles,
  Sun,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/components/layout/AppContext';
import TaskItem from '@/components/tasks/TaskItem';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { AnimatedNumber, EmptyState, Progress, Skeleton } from '@/components/ui/Controls';
import { ActivityBars } from '@/components/finance/Charts';
import { api, emit, on, todayParams } from '@/lib/client/api';
import { formatMoney, formatTime, greeting, relativeDay } from '@/lib/format';
import { ymd } from '@/lib/when';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

function StatCard({ icon: Icon, label, value, sub, tone, format }) {
  return (
    <motion.div variants={item} className="card stat card-hover">
      <div className="stat-label">
        <span className="stat-icon" style={tone ? { background: `color-mix(in oklch, ${tone}, transparent 86%)`, color: tone } : undefined}>
          <Icon />
        </span>
        {label}
      </div>
      <div className="stat-value">
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, currency, openSheet } = useApp();
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/dashboard?${todayParams()}`));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('tasks-changed', load), [load]);
  useEffect(() => on('money-changed', load), [load]);
  useEffect(() => on('reminders-changed', load), [load]);

  async function toggle(task) {
    try {
      await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: { done: !task.done } });
      setData((d) => ({ ...d, tasks: { ...d.tasks, today: d.tasks.today.map((t) => (t._id === task._id ? { ...t, done: !t.done } : t)) } }));
      setTimeout(() => emit('tasks-changed'), 500);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const money = (v) => formatMoney(v, currency, { compact: v >= 100000 });
  const first = user?.name?.split(' ')[0] || '';

  if (!data) {
    return (
      <div className="stack stack-lg">
        <Skeleton h={120} r={24} />
        <div className="grid grid-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={120} r={20} />
          ))}
        </div>
        <div className="grid grid-2">
          <Skeleton h={320} r={20} />
          <Skeleton h={320} r={20} />
        </div>
      </div>
    );
  }

  const { tasks, reminders, finance, bills, activity } = data;
  const todayOpen = tasks.today.filter((t) => !t.done).length;
  const totalToday = tasks.today.length + tasks.doneToday;
  const pct = totalToday ? Math.round((tasks.doneToday / totalToday) * 100) : 0;
  const budgetPct = finance.budgetTotal ? Math.round((finance.expense / finance.budgetTotal) * 100) : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="stack stack-lg">
      <motion.section variants={item} className="card hero-card">
        <div className="row between row-wrap" style={{ position: 'relative', gap: 20 }}>
          <div>
            <p className="muted small">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', margin: '6px 0 8px' }}>
              {greeting()}
              {first ? `, ${first}` : ''} 👋
            </h1>
            <p className="muted">
              {todayOpen === 0
                ? tasks.doneToday
                  ? 'Everything for today is ticked off. Go enjoy your evening.'
                  : 'A clear day ahead — perfect for getting ahead of the week.'
                : `${todayOpen} thing${todayOpen > 1 ? 's' : ''} left for today${tasks.overdue ? ` and ${tasks.overdue} catching up from before` : ''}. You've got this.`}
            </p>
            <div className="row row-wrap" style={{ marginTop: 18, gap: 8 }}>
              <button className="btn" style={{ background: '#fff', color: '#1e1b4b' }} onClick={() => openSheet('task', { date: ymd(new Date()) })}>
                <Plus /> Add task
              </button>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }} onClick={() => openSheet('reminder')}>
                <Bell /> Remind me
              </button>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }} onClick={() => openSheet('money', { type: 'expense' })}>
                <Receipt /> Log spend
              </button>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }} onClick={() => openSheet('money', { type: 'expense', split: true })}>
                <UsersRound /> Split a bill
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', width: 116, height: 116 }} aria-label={`${pct}% of today's tasks done`}>
            <svg viewBox="0 0 120 120" width="116" height="116">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="11" />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#fff"
                strokeWidth="11"
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: pct / 100 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div>
                <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{pct}%</div>
                <div className="tiny muted">today</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-4">
        <StatCard icon={CircleCheck} label="Open tasks" value={tasks.totalOpen} sub={`${tasks.doneToday} done today`} />
        <StatCard icon={Flame} label="Done this week" value={tasks.completedWeek} sub="Last 7 days" tone="var(--warning)" />
        <StatCard icon={TrendingUp} label="Income" value={finance.income} format={money} sub="This month" tone="var(--success)" />
        <StatCard
          icon={TrendingDown}
          label="Spent"
          value={finance.expense}
          format={money}
          sub={budgetPct !== null ? `${budgetPct}% of budget` : 'This month'}
          tone={budgetPct >= 100 ? 'var(--danger)' : 'var(--info)'}
        />
      </div>

      <div className="grid grid-2">
        <motion.section variants={item} className="card card-pad">
          <div className="card-title">
            <h3>
              <Sun size={18} /> My Day
              {tasks.overdue > 0 && (
                <span className="chip chip-danger">
                  <TriangleAlert /> {tasks.overdue} overdue
                </span>
              )}
            </h3>
            <Link href="/tasks?view=today" className="btn btn-ghost btn-sm">
              See all <ArrowRight />
            </Link>
          </div>
          {tasks.today.length === 0 ? (
            <EmptyState icon={Sparkles} title="Your day is clear" text="Nothing due today. Plan something, or just breathe." action={<button className="btn btn-soft btn-sm" onClick={() => openSheet('task', { date: ymd(new Date()) })}><Plus /> Add a task</button>} />
          ) : (
            <div className="task-list">
              {tasks.today.map((t) => (
                <TaskItem key={t._id} task={t} onToggle={toggle} onOpen={setActive} />
              ))}
            </div>
          )}
        </motion.section>

        <div className="stack stack-lg">
          <motion.section variants={item} className="card card-pad">
            <div className="card-title">
              <h3>
                <Bell size={18} /> Next reminders
              </h3>
              <Link href="/reminders" className="btn btn-ghost btn-sm">
                All <ArrowRight />
              </Link>
            </div>
            {reminders.length === 0 ? (
              <p className="muted small">Nothing scheduled. <button className="btn btn-ghost btn-sm" onClick={() => openSheet('reminder')}>Set a reminder</button></p>
            ) : (
              <div className="stack stack-sm">
                {reminders.map((r) => (
                  <div key={r._id} className="row" style={{ padding: '6px 0' }}>
                    <span className="stat-icon" style={{ width: 34, height: 34 }}>
                      <Bell />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="bold small truncate">{r.title}</div>
                      <div className="tiny faint">
                        {relativeDay(r.remindAt)} · {formatTime(r.remindAt)}
                        {r.repeat !== 'none' ? ` · ${r.repeat}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section variants={item} className="card card-pad">
            <div className="card-title">
              <h3>
                <Flame size={18} /> Your week
              </h3>
              <span className="tiny faint">tasks completed per day</span>
            </div>
            <ActivityBars data={activity} />
          </motion.section>
        </div>
      </div>

      <div className="grid grid-2">
        <motion.section variants={item} className="card card-pad">
          <div className="card-title">
            <h3>
              <Wallet size={18} /> Where your money went
            </h3>
            <Link href="/finance" className="btn btn-ghost btn-sm">
              Details <ArrowRight />
            </Link>
          </div>
          {finance.topCategories.length === 0 ? (
            <EmptyState icon={Receipt} title="No spending yet this month" action={<button className="btn btn-soft btn-sm" onClick={() => openSheet('money', { type: 'expense' })}><Plus /> Log an expense</button>} />
          ) : (
            <div className="stack">
              {finance.topCategories.map((c) => (
                <div key={c.category} className="row">
                  <CategoryIcon name={c.category} size={34} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between small">
                      <span className="bold truncate">{c.category}</span>
                      <span className="num bold">{formatMoney(c.total, currency)}</span>
                    </div>
                    <Progress value={c.total} max={finance.expense} tone="plain" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section variants={item} className="card card-pad">
          <div className="card-title">
            <h3>
              <Receipt size={18} /> Bills due soon
            </h3>
            <Link href="/finance?tab=bills" className="btn btn-ghost btn-sm">
              Manage <ArrowRight />
            </Link>
          </div>
          {bills.length === 0 ? (
            <p className="muted small">No bills due in the next 10 days. Add rent, EMIs, insurance or subscriptions on the Money page to get alerts.</p>
          ) : (
            <div className="stack stack-sm">
              {bills.map((b) => (
                <div key={b._id} className="row" style={{ padding: '6px 0' }}>
                  <CategoryIcon name={b.category} size={34} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold small truncate">{b.name}</div>
                    <div className="tiny faint">{relativeDay(b.next.dueDate)}</div>
                  </div>
                  <span className={`chip ${b.next.status === 'overdue' ? 'chip-danger' : b.next.status === 'due-soon' ? 'chip-warning' : ''}`}>
                    {b.next.status === 'overdue' ? 'Overdue' : b.next.daysLeft === 0 ? 'Today' : `${b.next.daysLeft}d`}
                  </span>
                  <span className="num bold small" style={{ minWidth: 70, textAlign: 'right' }}>
                    {formatMoney(b.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      <TaskDrawer task={active} open={Boolean(active)} onClose={() => setActive(null)} onChanged={() => load()} onDeleted={() => load()} />
    </motion.div>
  );
}
