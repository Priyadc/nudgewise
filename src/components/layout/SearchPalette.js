'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CircleCheck, Loader2, PiggyBank, Search, X } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { api, on } from '@/lib/client/api';
import { formatMoney, relativeDay, formatTime } from '@/lib/format';
import { useApp } from './AppContext';

/** Press "/" (or tap the search icon) to find any task, reminder, money entry or goal */
export default function SearchPalette() {
  const router = useRouter();
  const { openSheet, currency } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => on('open-search', () => setOpen(true)), []);
  useEffect(() => {
    if (open) {
      setQ('');
      setRes(null);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((d) => {
          setRes(d);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const items = useMemo(() => {
    if (!res) return [];
    return [
      ...res.tasks.map((t) => ({
        key: `t${t._id}`,
        group: 'Tasks',
        icon: <CircleCheck className={t.done ? 'faint' : ''} />,
        title: t.title,
        sub: [t.dueDate ? `${relativeDay(t.dueDate)}${t.hasTime ? ` · ${formatTime(t.dueDate)}` : ''}` : null, t.list ? `${t.list.icon} ${t.list.name}` : null, t.done ? 'done' : null].filter(Boolean).join(' · '),
        go: () => router.push(`/tasks?task=${t._id}`),
      })),
      ...res.reminders.map((r) => ({
        key: `r${r._id}`,
        group: 'Reminders',
        icon: <Bell />,
        title: r.title,
        sub: `${relativeDay(r.remindAt)} · ${formatTime(r.remindAt)}${r.status === 'done' ? ' · done' : ''}`,
        go: () => openSheet('reminder', { reminder: r }),
      })),
      ...res.transactions.map((t) => ({
        key: `m${t._id}`,
        group: 'Money',
        icon: <CategoryIcon name={t.category} size={28} />,
        title: t.note || t.category,
        sub: `${t.type === 'income' ? '+' : '−'}${formatMoney(t.amount, currency)} · ${t.category} · ${relativeDay(t.date)}`,
        go: () => openSheet('money', { txn: t }),
      })),
      ...(res.goals || []).map((g) => ({
        key: `g${g._id}`,
        group: 'Savings goals',
        icon: <PiggyBank />,
        title: `${g.emoji || '🎯'} ${g.name}`,
        sub: `${formatMoney(g.saved, currency)} of ${formatMoney(g.target, currency)}`,
        go: () => router.push('/finance?tab=goals'),
      })),
    ];
  }, [res, router, openSheet, currency]);

  function pick(it) {
    setOpen(false);
    it.go();
  }

  function onKey(e) {
    if (e.key === 'Escape') setOpen(false);
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      pick(items[active]);
    }
  }

  let lastGroup = null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="search-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
          <motion.div
            className="search-box"
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="search-input">
              <Search />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search tasks, reminders, money, goals…" aria-label="Search" />
              {loading ? <Loader2 className="spin faint" /> : q && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setQ('')} aria-label="Clear"><X /></button>}
              <span className="kbd hide-mobile">Esc</span>
            </div>
            <div className="search-results">
              {q.trim().length < 2 ? (
                <p className="tiny muted" style={{ padding: 16 }}>Type at least 2 letters. Try a person's name, "rent", or a #tag.</p>
              ) : res && !items.length ? (
                <p className="small muted" style={{ padding: 16 }}>Nothing found for “{q}”.</p>
              ) : (
                items.map((it, i) => {
                  const header = it.group !== lastGroup ? it.group : null;
                  lastGroup = it.group;
                  return (
                    <div key={it.key}>
                      {header && <div className="search-group">{header}</div>}
                      <button className={`search-item ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => pick(it)}>
                        <span className="search-icon">{it.icon}</span>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="bold small truncate" style={{ display: 'block' }}>{it.title}</span>
                          {it.sub && <span className="tiny muted truncate" style={{ display: 'block' }}>{it.sub}</span>}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
