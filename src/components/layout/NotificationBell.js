'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, CalendarClock, CheckCheck, Share2, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api, emit } from '@/lib/client/api';
import { timeAgo } from '@/lib/format';

const ICON = { reminder: BellRing, bill: Wallet, share: Share2, system: CalendarClock };
const POLL_MS = 45_000;

/** Bell with unread badge. Polls for new notifications and shows a toast (+ system notification) for fresh ones. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const since = useRef(new Date().toISOString());
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      if (document.hidden) return;
      try {
        const d = await api(`/api/notifications?since=${encodeURIComponent(since.current)}`);
        if (!alive) return;
        since.current = d.now;
        setData({ items: d.items, unread: d.unread });
        d.fresh.forEach((n) => {
          toast(n.title, {
            description: n.body,
            icon: '🔔',
            duration: 10000,
            action: { label: 'Open', onClick: () => router.push(n.url) },
          });
          if (n.type === 'reminder') emit('reminders-changed');
        });
      } catch {}
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    const vis = () => !document.hidden && poll();
    document.addEventListener('visibilitychange', vis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function markAll() {
    await api('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setData((d) => ({ items: d.items.map((i) => ({ ...i, read: true })), unread: 0 }));
  }
  async function clearAll() {
    await api('/api/notifications', { method: 'DELETE' }).catch(() => {});
    setData({ items: [], unread: 0 });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-ghost btn-icon" onClick={() => setOpen((o) => !o)} aria-label={`Notifications (${data.unread} unread)`}>
        <motion.span key={data.unread} animate={data.unread ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }} style={{ display: 'grid' }}>
          <Bell />
        </motion.span>
        {data.unread > 0 && (
          <span className="badge-count" style={{ position: 'absolute', top: 2, right: 2 }}>
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="menu"
            style={{ right: 0, top: 'calc(100% + 8px)', width: 'min(360px, calc(100vw - 32px))', padding: 0 }}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
          >
            <div className="row between" style={{ padding: '14px 14px 10px' }}>
              <strong>Notifications</strong>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={markAll} disabled={!data.unread}>
                  <CheckCheck /> Read all
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={clearAll} aria-label="Clear all" disabled={!data.items.length}>
                  <Trash2 />
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '0 6px 6px' }}>
              {data.items.length === 0 && <p className="muted small center" style={{ padding: 28 }}>You're all caught up ✨</p>}
              {data.items.map((n) => {
                const Icon = ICON[n.type] || Bell;
                return (
                  <button
                    key={n._id}
                    className="menu-item"
                    style={{ alignItems: 'flex-start', background: n.read ? undefined : 'var(--accent-softer)', marginBottom: 2 }}
                    onClick={() => {
                      setOpen(false);
                      api(`/api/notifications?id=${n._id}`, { method: 'PATCH' }).catch(() => {});
                      router.push(n.url);
                    }}
                  >
                    <span className="stat-icon" style={{ width: 30, height: 30, borderRadius: 9 }}>
                      <Icon style={{ color: 'var(--accent)' }} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="bold" style={{ display: 'block', fontSize: 13.5 }}>
                        {n.title}
                      </span>
                      {n.body && <span className="tiny muted">{n.body} · </span>}
                      <span className="tiny faint">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
