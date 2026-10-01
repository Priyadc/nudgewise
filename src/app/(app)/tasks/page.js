'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarRange,
  CircleCheck,
  FolderOpen,
  ListTodo,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  TriangleAlert,
  Sparkles,
  Sun,
  ArrowLeft,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import TaskItem from '@/components/tasks/TaskItem';
import TaskDrawer from '@/components/tasks/TaskDrawer';
import ShareDialog from '@/components/tasks/ShareDialog';
import ListModal from '@/components/tasks/ListModal';
import { Tabs, EmptyState, SkeletonList, Avatar } from '@/components/ui/Controls';
import { Confirm } from '@/components/ui/Modal';
import VoiceButton, { VoiceBar } from '@/components/ui/VoiceButton';
import Menu from '@/components/ui/Menu';
import { useApp } from '@/components/layout/AppContext';
import { api, emit, on, todayParams } from '@/lib/client/api';
import { parseTask } from '@/lib/nlp';
import { relativeDay } from '@/lib/format';
import { ymd } from '@/lib/when';
import { celebrateDayCleared, isMyDay } from '@/lib/client/celebrate';
import Examples from '@/components/ui/Examples';
import { taskExamples } from '@/lib/client/examples';
import { parsePrice } from '@/lib/money-math';
import { formatMoney } from '@/lib/format';

const VIEWS = {
  today: { title: 'My Day', icon: Sun, sub: 'What needs you today — plus anything that slipped' },
  upcoming: { title: 'Coming Up', icon: CalendarRange, sub: 'Everything planned for the days ahead' },
  all: { title: 'All tasks', icon: ListTodo, sub: 'Every open task, in one place' },
  completed: { title: 'Done', icon: CircleCheck, sub: 'Look at everything you finished 🎉' },
  inbox: { title: 'No list', icon: FolderOpen, sub: 'Tasks that are not in a list yet' },
};

const BASE_TABS = {
  today: { label: 'My Day', icon: Sun },
  upcoming: { label: 'Coming Up', icon: CalendarRange },
  all: { label: 'All tasks', icon: ListTodo },
};

const EMPTY = {
  today: { title: 'Your day is clear', text: 'Nothing due today. Enjoy it — or plan something below.' },
  upcoming: { title: 'Nothing planned yet', text: 'Give a task a date and it will line up here.' },
  all: { title: 'All clear!', text: 'Add a task above, or press N anywhere.' },
  completed: { title: 'Nothing finished yet', text: 'Tick off a task and it will show up here.' },
  inbox: { title: 'Nothing here', text: 'Every task is in a list.' },
};

function daySummary(tasks) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  const open = tasks.filter((t) => !t.done && t.dueDate);
  const today = open.filter((t) => new Date(t.dueDate) >= start && new Date(t.dueDate) < end).length;
  const h = new Date().getHours();
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  if (!today) return `${hello} — nothing else due today`;
  return `${hello} — ${today} thing${today > 1 ? 's' : ''} to do today`;
}

function groupTasks(tasks, view) {
  if (view === 'completed') return [{ key: 'done', title: null, items: tasks }];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  const groups = new Map();
  const push = (key, title, t, cls) => {
    if (!groups.has(key)) groups.set(key, { key, title, items: [], cls });
    groups.get(key).items.push(t);
  };
  for (const t of tasks) {
    if (!t.dueDate) push('zz-nodate', 'No date', t);
    else {
      const d = new Date(t.dueDate);
      if (d < start) push('0-overdue', 'Overdue', t, 'overdue');
      else if (d < end) push('1-today', 'Today', t);
      else {
        const key = `2-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        push(key, relativeDay(d), t);
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function sortTasks(tasks, sort) {
  const arr = [...tasks];
  if (sort === 'priority') arr.sort((a, b) => b.priority - a.priority || new Date(a.dueDate || 8e15) - new Date(b.dueDate || 8e15));
  else if (sort === 'newest') arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else arr.sort((a, b) => new Date(a.dueDate || 8e15) - new Date(b.dueDate || 8e15) || b.priority - a.priority);
  return arr;
}

function TasksPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const listId = sp.get('list');
  const openTaskId = sp.get('task');
  const [view, setView] = useState(sp.get('view') || 'all');
  const { lists, setLists, openSheet, currency } = useApp();
  const list = lists.find((l) => l._id === listId);
  const readOnly = list?.role === 'viewer';
  const shopping = list?.kind === 'shopping';
  const tripStartedAt = list?.tripStartedAt || null;
  const [checkingOut, setCheckingOut] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('due');
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editList, setEditList] = useState(false);
  const [confirmList, setConfirmList] = useState(false);

  useEffect(() => {
    setView(sp.get('view') || 'all');
  }, [sp]);

  // Which view "Done" belongs to (My Day → Done → back to My Day)
  const fromParam = sp.get('from');
  const baseView = view === 'completed' ? (BASE_TABS[fromParam] ? fromParam : 'all') : BASE_TABS[view] ? view : 'all';
  const goView = (v) => {
    if (v === 'completed') router.push(`/tasks?view=completed${baseView !== 'all' ? `&from=${baseView}` : ''}`);
    else router.push(`/tasks${v === 'all' ? '' : `?view=${v}`}`);
  };

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      const params = todayParams();
      params.set('view', listId && view !== 'completed' ? 'all' : view);
      if (listId) params.set('list', listId);
      // Shopping lists keep ticked items visible as the cart until the trip is finished
      if (shopping && view !== 'completed') params.set('doneSince', tripStartedAt || new Date(0).toISOString());
      if (q.trim()) params.set('q', q.trim());
      if (priority) params.set('priority', priority);
      try {
        const d = await api(`/api/tasks?${params}`);
        setTasks(d.tasks);
      } catch (err) {
        toast.error(err.message);
        if (err.status === 404 && listId) router.replace('/tasks');
      } finally {
        setLoading(false);
      }
    },
    [listId, view, q, priority, router, shopping, tripStartedAt]
  );

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => on('tasks-changed', () => load(true)), [load]);

  // Deep link from a notification: /tasks?task=<id>
  useEffect(() => {
    if (!openTaskId) return;
    api(`/api/tasks/${openTaskId}`)
      .then((d) => setActive(d.task))
      .catch(() => {});
  }, [openTaskId]);

  async function toggle(task) {
    const done = !task.done;
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, done } : t)));
    try {
      const d = await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: { done } });
      emit('lists-changed');
      // Last thing in My Day ticked off → party time
      if (done && view === 'today' && !tasks.some((t) => t._id !== task._id && isMyDay(t))) celebrateDayCleared();
      if (d.rescheduled) {
        setTasks((ts) => ts.map((t) => (t._id === task._id ? d.task : t)));
        toast.success('Done! Next one scheduled', { description: relativeDay(d.task.dueDate) });
        return;
      }
      // Shopping lists: ticked items stay in the cart
      if (shopping && view !== 'completed') return;
      // Let the check animation play, then remove it from open views
      if (done && view !== 'completed') setTimeout(() => setTasks((ts) => ts.filter((t) => t._id !== task._id)), 450);
      if (!done && view === 'completed') setTasks((ts) => ts.filter((t) => t._id !== task._id));
      if (done) {
        toast.success('Task completed', {
          description: task.title,
          action: {
            label: 'Undo',
            onClick: async () => {
              await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: { done: false } });
              emit('tasks-changed');
            },
          },
        });
      }
    } catch (err) {
      toast.error(err.message);
      load(true);
    }
  }

  async function quickAdd(e) {
    e.preventDefault();
    // "Milk ₹45" in a shopping list → item "Milk" priced ₹45
    const priced = shopping ? parsePrice(text) : { title: text, price: null };
    const p = parseTask(priced.title);
    if (!p.title) return;
    setAdding(true);
    try {
      const target = listId || lists.find((l) => l.name.toLowerCase() === p.listName?.toLowerCase())?._id || null;
      let dueDate = p.dueDate;
      if (!dueDate && view === 'today') dueDate = new Date(new Date().setHours(23, 59, 0, 0));
      const created = await api('/api/tasks', {
        method: 'POST',
        body: {
          ...(shopping && priced.price !== null ? { price: priced.price } : {}),
          title: p.title,
          dueDate,
          hasTime: p.hasTime,
          priority: p.priority,
          tags: p.tags,
          repeat: p.repeat,
          list: target,
          reminderAt: p.remind || p.hasTime ? dueDate : null,
        },
      });
      setText('');
      emit('tasks-changed');
      if (created?.priceRemembered) toast(`Remembered ${formatMoney(created.task.price, currency)} from last time`, { description: created.task.title });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function checkout(logExpense) {
    setCheckingOut(true);
    try {
      const d = await api(`/api/lists/${listId}/checkout`, { method: 'POST', body: { logExpense } });
      setLists((ls) => ls.map((l) => (l._id === listId ? { ...l, tripStartedAt: d.tripStartedAt } : l)));
      if (d.transaction) {
        toast.success(`${formatMoney(d.total, currency)} added to Groceries`, { description: `${d.count} item${d.count === 1 ? '' : 's'} from ${list.name}` });
        emit('money-changed');
      } else toast.success('Cart cleared', { description: 'Ticked items moved to Done' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function deleteList() {
    try {
      const d = await api(`/api/lists/${listId}`, { method: 'DELETE' });
      toast.success(d.left ? 'You left the list' : 'List deleted');
      setLists((ls) => ls.filter((l) => l._id !== listId));
      setConfirmList(false);
      router.replace('/tasks');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const sorted = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);
  const groups = useMemo(() => {
    if (shopping && view !== 'completed') {
      return [
        { key: 'to-buy', title: null, items: sorted.filter((t) => !t.done) },
        { key: 'cart', title: '🛒 In your cart', items: sorted.filter((t) => t.done) },
      ].filter((g) => g.items.length);
    }
    return sort === 'due' ? groupTasks(sorted, listId ? (view === 'completed' ? 'completed' : 'all') : view) : [{ key: 'all', title: null, items: sorted }];
  }, [sorted, sort, view, listId, shopping]);
  const cart = useMemo(() => {
    if (!shopping) return null;
    const priced = (ts) => ts.reduce((s, t) => s + (t.price || 0), 0);
    const inCart = tasks.filter((t) => t.done);
    return { cart: priced(inCart), all: priced(tasks), count: inCart.length, open: tasks.length - inCart.length, unpriced: tasks.filter((t) => t.price === null || t.price === undefined).length };
  }, [tasks, shopping]);
  const meta = VIEWS[view] || VIEWS.all;
  const preview = text ? parseTask(text) : null;
  const overdueCount = tasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))).length;

  return (
    <>
      {sp.get('ref') === 'dashboard' && (
        <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="btn btn-ghost btn-sm back-link" onClick={() => (window.history.length > 1 ? router.back() : router.push('/dashboard'))}>
          <ArrowLeft /> Back to dashboard
        </motion.button>
      )}
      <div className="page-header">
        <div className="row" style={{ gap: 14 }}>
          <motion.div
            key={listId || view}
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="stat-icon"
            style={{ width: 48, height: 48, borderRadius: 16, fontSize: 24, background: list ? `${list.color}22` : undefined }}
          >
            {list ? list.icon : <meta.icon />}
          </motion.div>
          <div>
            <h1>{list ? list.name : meta.title}</h1>
            <p>
              {list ? (list.shared ? `Shared · you are ${list.role}` : 'Personal list') : view === 'today' && !loading ? daySummary(tasks) : meta.sub}
              {overdueCount > 0 && view !== 'completed' && (
                <span className="chip chip-danger" style={{ marginLeft: 8 }}>
                  <TriangleAlert /> {overdueCount} overdue
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="row">
          {!readOnly && view !== 'completed' && (
            <button className="btn btn-primary" onClick={() => openSheet('task', { list: listId || '', date: view === 'today' ? ymd(new Date()) : '' })}>
              <Plus /> New task
            </button>
          )}
        {list && (
          <div className="row">
            {list.shared && (
              <div className="avatar-stack hide-mobile">
                {[list.owner, ...(list.members || []).map((m) => m.user)]
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((u) => (
                    <Avatar key={u._id} user={u} size="sm" />
                  ))}
              </div>
            )}
            <button className="btn btn-soft" onClick={() => setShareOpen(true)}>
              <Share2 /> Share
            </button>
            <Menu
              trigger={
                <button className="btn btn-ghost btn-icon" aria-label="List options">
                  <MoreHorizontal />
                </button>
              }
              items={[
                list.role !== 'viewer' && { label: 'Edit list', icon: Pencil, onClick: () => setEditList(true) },
                list.role === 'owner'
                  ? { label: 'Delete list', icon: Trash2, danger: true, onClick: () => setConfirmList(true) }
                  : { label: 'Leave list', icon: LogOut, danger: true, onClick: () => setConfirmList(true) },
              ]}
            />
          </div>
        )}
        </div>
      </div>

      <div className="stack stack-lg">
        {!listId ? (
          <>
            {/* Desktop: the sidebar already switches views, so show just this view + Done */}
            <div className="hide-mobile">
              <Tabs
                value={view === 'completed' ? 'completed' : baseView}
                onChange={goView}
                tabs={[
                  { value: baseView, label: BASE_TABS[baseView].label, icon: BASE_TABS[baseView].icon },
                  { value: 'completed', label: 'Done', icon: CircleCheck },
                ]}
              />
            </div>
            {/* Phone: no sidebar, so keep every view one tap away */}
            <div className="show-mobile">
              <Tabs
                value={view}
                onChange={goView}
                tabs={[
                  { value: 'today', label: 'My Day', icon: Sun },
                  { value: 'upcoming', label: 'Coming Up', icon: CalendarRange },
                  { value: 'all', label: 'All', icon: ListTodo },
                  { value: 'completed', label: 'Done', icon: CircleCheck },
                ]}
              />
            </div>
          </>
        ) : (
          <Tabs
            value={view === 'completed' ? 'completed' : 'all'}
            onChange={(v) => router.push(`/tasks?list=${listId}${v === 'completed' ? '&view=completed' : ''}`)}
            tabs={[
              { value: 'all', label: 'Open', icon: ListTodo, count: list?.pending },
              { value: 'completed', label: 'Done', icon: CircleCheck },
            ]}
          />
        )}

        {view !== 'completed' && !readOnly && (
          <div>
            <form onSubmit={quickAdd} className="quick-add">
              <Plus size={20} className="faint" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={shopping ? `Add to ${list.name} — try "Milk ₹45" or just "Eggs"` : `Quick add${list ? ` to ${list.name}` : ''} — try "Pay rent friday 10am !high"`}
                aria-label="New task"
              />
              <VoiceButton className="btn btn-ghost btn-icon btn-sm" onText={(t) => setText((p) => (p ? `${p} ${t}` : t))} onInterim={setInterim} />
              <button className="btn btn-primary btn-sm" disabled={!text.trim() || adding}>
                {adding ? <Loader2 className="spin" /> : 'Add'}
              </button>
            </form>
            <VoiceBar text={interim} />
            <AnimatePresence>
              {preview && (preview.dueDate || preview.priority || preview.tags.length || preview.repeat !== 'none') && (
                <motion.div className="parse-preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Sparkles size={14} className="faint" />
                  {preview.dueDate && <span className="chip chip-accent">📅 {relativeDay(preview.dueDate)}{preview.hasTime ? ` ${preview.dueDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span>}
                  {preview.priority > 0 && <span className="chip">🚩 {['', 'Low', 'Medium', 'High'][preview.priority]}</span>}
                  {preview.repeat !== 'none' && <span className="chip chip-info">🔁 {preview.repeat}</span>}
                  {preview.tags.map((t) => (
                    <span key={t} className="chip">
                      #{t}
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {cart && view !== 'completed' && tasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad shop-bar">
            <div className="row" style={{ gap: 12 }}>
              <span className="stat-icon" style={{ width: 42, height: 42 }}>
                <ShoppingCart />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="tiny muted">In your cart · {cart.count} item{cart.count === 1 ? '' : 's'}</div>
                <div className="shop-total num">{formatMoney(cart.cart, currency)}</div>
                <div className="tiny faint">
                  Whole list ≈ {formatMoney(cart.all, currency)}
                  {cart.unpriced > 0 ? ` · ${cart.unpriced} without a price` : ''}
                </div>
              </div>
            </div>
            {!readOnly && cart.count > 0 && (
              <div className="row row-wrap" style={{ gap: 8 }}>
                <button className="btn btn-primary btn-sm" disabled={checkingOut} onClick={() => checkout(true)}>
                  {checkingOut ? <Loader2 className="spin" /> : <CircleCheck />} Done shopping{cart.cart > 0 ? ` · log ${formatMoney(cart.cart, currency)}` : ''}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={checkingOut} onClick={() => checkout(false)}>
                  Clear cart
                </button>
              </div>
            )}
          </motion.div>
        )}

        <div className="row row-wrap" style={{ gap: 8 }}>
          <div className="input-wrap grow" style={{ minWidth: 200 }}>
            <Search />
            <input className="input" placeholder="Search tasks, notes, #tags" value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 40 }} />
          </div>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 150, height: 40 }} aria-label="Filter by priority">
            <option value="">All priorities</option>
            <option value="3">High</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
            <option value="0">None</option>
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 150, height: 40 }} aria-label="Sort">
            <option value="due">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        {loading ? (
          <SkeletonList rows={5} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={view === 'completed' ? CircleCheck : Sparkles}
            title={q ? 'No matches' : (EMPTY[listId ? (view === 'completed' ? 'completed' : 'all') : view] || EMPTY.all).title}
            text={q ? 'Try a different search.' : (EMPTY[listId ? (view === 'completed' ? 'completed' : 'all') : view] || EMPTY.all).text}
            action={!q && view !== 'completed' && !readOnly && <Examples items={taskExamples(listId ? 'all' : view, openSheet, listId || '')} />}
          />
        ) : (
          <div>
            {groups.map((g) => (
              <section key={g.key}>
                {g.title && (
                  <div className={`task-group-title ${g.cls || ''}`}>
                    {g.title} <span className="faint">· {g.items.length}</span>
                  </div>
                )}
                <div className="task-list">
                  <AnimatePresence initial={false} mode="popLayout">
                    {g.items.map((t) => (
                      <TaskItem
                        key={t._id}
                        task={t}
                        onToggle={toggle}
                        onOpen={setActive}
                        onDeleted={(id) => setTasks((ts) => ts.filter((x) => x._id !== id))}
                        showList={!listId}
                        readOnly={readOnly}
                        shopping={shopping}
                        currencySymbol={currencySymbol(currency)}
                        onChanged={(nt) => setTasks((ts) => ts.map((x) => (x._id === nt._id ? { ...x, price: nt.price } : x)))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <TaskDrawer
        task={active}
        open={Boolean(active)}
        onClose={() => {
          setActive(null);
          if (openTaskId) router.replace(listId ? `/tasks?list=${listId}` : '/tasks');
        }}
        onChanged={(t) => setTasks((ts) => ts.map((x) => (x._id === t._id ? t : x)))}
        onDeleted={(id) => setTasks((ts) => ts.filter((x) => x._id !== id))}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} list={list} onUpdated={(l) => setLists((ls) => ls.map((x) => (x._id === l._id ? { ...x, ...l } : x)))} />
      <ListModal open={editList} onClose={() => setEditList(false)} list={list} />
      <Confirm
        open={confirmList}
        onClose={() => setConfirmList(false)}
        onConfirm={deleteList}
        title={list?.role === 'owner' ? 'Delete this list?' : 'Leave this list?'}
        message={list?.role === 'owner' ? 'All tasks in it will be deleted for everyone it is shared with.' : 'You will lose access until someone shares it with you again.'}
        confirmLabel={list?.role === 'owner' ? 'Delete' : 'Leave'}
      />
    </>
  );
}

function currencySymbol(code) {
  try {
    return (0).toLocaleString('en', { style: 'currency', currency: code, maximumFractionDigits: 0 }).replace(/[\d\s.,]/g, '') || code;
  } catch {
    return code;
  }
}

export default function TasksPage() {
  return (
    <Suspense fallback={<SkeletonList rows={6} />}>
      <TasksPageInner />
    </Suspense>
  );
}
