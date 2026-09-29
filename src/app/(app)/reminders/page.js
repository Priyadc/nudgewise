'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Bell, BellOff, BellRing, Check, Clock, Mail, MoreHorizontal, Pencil, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, SkeletonList, Tabs } from '@/components/ui/Controls';
import ReminderModal from '@/components/reminders/ReminderModal';
import Menu from '@/components/ui/Menu';
import { api, on } from '@/lib/client/api';
import { enablePush, pushPermission } from '@/lib/client/push';
import { formatTime, relativeDay } from '@/lib/format';
import { useApp } from '@/components/layout/AppContext';

export default function RemindersPage() {
  const { features } = useApp();
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | reminder
  const [perm, setPerm] = useState('default');

  useEffect(() => setPerm(pushPermission()), []);

  const load = useCallback(async () => {
    try {
      const d = await api('/api/reminders');
      setItems(d.reminders);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('reminders-changed', load), [load]);

  const now = Date.now();
  const active = useMemo(() => (items || []).filter((r) => r.status === 'active').sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt)), [items]);
  const done = useMemo(() => (items || []).filter((r) => r.status === 'done').reverse(), [items]);
  const shown = tab === 'active' ? active : done;

  async function patch(r, body, msg) {
    setItems((xs) => xs.map((x) => (x._id === r._id ? { ...x, ...body } : x)));
    try {
      await api(`/api/reminders/${r._id}`, { method: 'PATCH', body });
      if (msg) toast.success(msg);
      load();
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }

  async function remove(r) {
    setItems((xs) => xs.filter((x) => x._id !== r._id));
    try {
      await api(`/api/reminders/${r._id}`, { method: 'DELETE' });
      toast.success('Reminder deleted');
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }

  const snooze = (r, mins) => patch(r, { remindAt: new Date(Date.now() + mins * 60000), status: 'active' }, `Snoozed for ${mins >= 60 ? `${mins / 60}h` : `${mins} min`}`);

  async function turnOnPush() {
    try {
      await enablePush();
      setPerm('granted');
      await api('/api/push/test', { method: 'POST' }).catch(() => {});
      toast.success('Notifications enabled on this device');
    } catch (err) {
      toast.error(err.message);
      setPerm(pushPermission());
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reminders</h1>
          <p>Say it once. We'll tap you on the shoulder at exactly the right moment.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus /> New reminder
        </button>
      </div>

      <AnimatePresence>
        {features.push && perm !== 'granted' && perm !== 'unsupported' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="card card-pad row row-wrap between" style={{ marginBottom: 20, gap: 14, borderColor: 'var(--accent-ring)' }}>
            <div className="row">
              <span className="stat-icon">
                <BellRing />
              </span>
              <div>
                <div className="bold">Get reminders even when Pockeazy is closed</div>
                <div className="small muted">{perm === 'denied' ? 'Notifications are blocked — allow them in your browser site settings.' : 'Turn on push notifications for this device.'}</div>
              </div>
            </div>
            {perm !== 'denied' && (
              <button className="btn btn-primary" onClick={turnOnPush}>
                <Bell /> Enable notifications
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stack stack-lg">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'active', label: 'Scheduled', icon: AlarmClock, count: active.length },
            { value: 'done', label: 'Done', icon: Check },
          ]}
        />

        {!items ? (
          <SkeletonList rows={4} h={72} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={tab === 'active' ? BellOff : Check}
            title={tab === 'active' ? 'No reminders yet' : 'Nothing here yet'}
            text={tab === 'active' ? 'Medicine, calls, bill dates — add one and forget about it until it matters.' : 'Reminders you mark as done show up here.'}
            action={tab === 'active' && <button className="btn btn-soft" onClick={() => setModal('new')}><Plus /> New reminder</button>}
          />
        ) : (
          <div className="task-list">
            <AnimatePresence initial={false}>
              {shown.map((r) => {
                const due = new Date(r.remindAt).getTime();
                const past = due < now && r.status === 'active';
                return (
                  <motion.div key={r._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="task-row" style={{ alignItems: 'center', cursor: 'default' }}>
                    <span className="stat-icon" style={{ width: 42, height: 42, borderRadius: 14, ...(past ? { background: 'var(--warning-soft)', color: 'var(--warning)' } : {}) }}>
                      {r.task ? <Check /> : <Bell />}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="task-title" style={r.status === 'done' ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}>
                        {r.title}
                      </div>
                      <div className="task-meta">
                        <span className={`chip ${past ? 'chip-warning' : 'chip-accent'}`}>
                          <Clock /> {relativeDay(r.remindAt)} · {formatTime(r.remindAt)}
                        </span>
                        {r.repeat !== 'none' && (
                          <span className="chip chip-info">
                            <Repeat /> {r.repeat}
                          </span>
                        )}
                        {r.channels?.email && (
                          <span className="chip">
                            <Mail /> email
                          </span>
                        )}
                        {r.task && <span className="chip">from a task</span>}
                        {r.note && <span className="small muted truncate">{r.note}</span>}
                      </div>
                    </div>
                    {r.status === 'active' ? (
                      <button className="btn btn-soft btn-sm hide-mobile" onClick={() => patch(r, { status: 'done' }, 'Marked as done')}>
                        <Check /> Done
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => patch(r, { status: 'active', remindAt: due > now ? r.remindAt : new Date(now + 3600000) }, 'Reminder restored')}>
                        <RotateCcw /> Restore
                      </button>
                    )}
                    <Menu
                      trigger={
                        <button className="btn btn-ghost btn-icon btn-sm" aria-label="More">
                          <MoreHorizontal />
                        </button>
                      }
                      items={[
                        r.status === 'active' && { label: 'Mark done', icon: Check, onClick: () => patch(r, { status: 'done' }, 'Marked as done') },
                        { label: 'Snooze 10 minutes', icon: AlarmClock, onClick: () => snooze(r, 10) },
                        { label: 'Snooze 1 hour', icon: AlarmClock, onClick: () => snooze(r, 60) },
                        { label: 'Snooze until tomorrow', icon: AlarmClock, onClick: () => snooze(r, 24 * 60) },
                        !r.task && { label: 'Edit', icon: Pencil, onClick: () => setModal(r) },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r) },
                      ]}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ReminderModal open={Boolean(modal)} onClose={() => setModal(null)} reminder={modal === 'new' ? null : modal} />
    </>
  );
}
