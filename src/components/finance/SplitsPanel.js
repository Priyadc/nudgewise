'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, CircleCheck, HandCoins, Loader2, Plus, Share2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, EmptyState, SkeletonList } from '@/components/ui/Controls';
import { Confirm } from '@/components/ui/Modal';
import { api, emit, on } from '@/lib/client/api';
import { formatMoney, relativeDay } from '@/lib/format';

/** Who owes you, who you owe, and one-tap "settle up" */
export default function SplitsPanel({ currency, onSplit }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [settling, setSettling] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const money = (v) => formatMoney(v, currency);

  const load = useCallback(async () => {
    try {
      setData(await api('/api/splits'));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => on('money-changed', load), [load]);

  async function settle(p) {
    setSettling(p.name);
    try {
      const d = await api('/api/splits', { method: 'POST', body: { action: 'settle', name: p.name } });
      setData(d);
      toast.success(`Settled up with ${p.name}`, { description: 'All shared bills with them are marked as paid back.' });
      emit('money-changed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSettling(null);
      setConfirm(null);
    }
  }

  async function nudge(p) {
    const text = `Hey ${p.name}! Quick one — you owe me ${money(p.net)} for ${p.items.filter((i) => i.direction === 'owes-me' && !i.settled).map((i) => i.note || i.category).slice(0, 3).join(', ')}. No rush 🙂`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success('Message copied — paste it in WhatsApp');
  }

  if (!data) return <SkeletonList rows={4} h={72} />;
  const people = data.people.filter((p) => p.items.length);

  return (
    <div className="stack stack-lg">
      <div className="grid grid-2">
        <div className="card stat">
          <div className="stat-label">
            <span className="stat-icon" style={{ background: 'color-mix(in oklch, var(--success), transparent 86%)', color: 'var(--success)' }}>
              <ArrowDownLeft />
            </span>
            Friends owe you
          </div>
          <div className="stat-value num" style={{ color: 'var(--success)' }}>
            {money(data.owedToMe)}
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">
            <span className="stat-icon" style={{ background: 'color-mix(in oklch, var(--danger), transparent 86%)', color: 'var(--danger)' }}>
              <ArrowUpRight />
            </span>
            You owe
          </div>
          <div className="stat-value num" style={{ color: data.iOwe ? 'var(--danger)' : undefined }}>
            {money(data.iOwe)}
          </div>
        </div>
      </div>

      <div className="row between row-wrap">
        <p className="muted small">Only your share of a split bill counts towards your spending and budgets.</p>
        <button className="btn btn-primary" onClick={onSplit}>
          <Plus /> Split a bill
        </button>
      </div>

      {people.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No shared bills yet"
          text="Dinner, a cab, a trip — split it with friends and we'll keep track of who owes whom."
          action={
            <button className="btn btn-soft" onClick={onSplit}>
              <UsersRound /> Split your first bill
            </button>
          }
        />
      ) : (
        <div className="stack">
          {people.map((p) => (
            <motion.div key={p.name} layout className="stack" style={{ gap: 0 }}>
              <div className="balance-row">
                <Avatar user={{ name: p.name }} />
                <button className="grow" style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', minWidth: 0 }} onClick={() => setOpen(open === p.name ? null : p.name)} aria-expanded={open === p.name}>
                  <div className="bold truncate">{p.name}</div>
                  <div className="small" style={{ color: p.net > 0 ? 'var(--success)' : p.net < 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                    {p.net > 0 ? `owes you ${money(p.net)}` : p.net < 0 ? `you owe ${money(-p.net)}` : 'all settled up'}
                  </div>
                </button>
                {p.net > 0 && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => nudge(p)} aria-label={`Remind ${p.name}`} title="Send a friendly reminder">
                    <Share2 />
                  </button>
                )}
                {p.net !== 0 && (
                  <button className="btn btn-soft btn-sm" onClick={() => setConfirm(p)} disabled={settling === p.name}>
                    {settling === p.name ? <Loader2 className="spin" /> : <HandCoins />} Settle up
                  </button>
                )}
                <ChevronDown size={18} className="faint" style={{ transform: open === p.name ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
              </div>
              <AnimatePresence initial={false}>
                {open === p.name && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="stack stack-sm" style={{ padding: '10px 14px 4px 58px' }}>
                      {p.items.map((i) => (
                        <div key={i.id + i.direction} className="row between small">
                          <span className="truncate" style={{ opacity: i.settled ? 0.55 : 1 }}>
                            {i.note || i.category} <span className="tiny faint">· {relativeDay(i.date)} · bill {money(i.total)}</span>
                          </span>
                          <span className="row" style={{ gap: 6, flexShrink: 0 }}>
                            {i.settled && <CircleCheck size={14} style={{ color: 'var(--success)' }} />}
                            <span className="num" style={{ color: i.settled ? 'var(--text-3)' : i.direction === 'owes-me' ? 'var(--success)' : 'var(--danger)' }}>
                              {i.direction === 'owes-me' ? '+' : '−'}
                              {money(i.share)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      <Confirm
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => settle(confirm)}
        title={`Settle up with ${confirm?.name}?`}
        message={confirm ? (confirm.net > 0 ? `Mark ${money(confirm.net)} as paid back to you.` : `Mark the ${money(-confirm.net)} you owe as paid.`) : ''}
        confirmLabel="Settle up"
        danger={false}
      />
    </div>
  );
}
