'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { categoryMeta } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import CategoryIcon from '@/components/ui/CategoryIcon';

/**
 * Spending donut. Colour = category identity; every slice is also named in the
 * legend with its icon, amount and share, so colour is never the only cue.
 * Shows the top 5 categories and folds the rest into "Everything else".
 */
export function SpendingDonut({ data = [], currency, size = 190 }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.total, 0);
  const top = data.slice(0, 5);
  const rest = data.slice(5).reduce((s, d) => s + d.total, 0);
  const slices = rest > 0 ? [...top, { category: 'Everything else', total: rest, color: '#94a3b8' }] : top;

  const r = 70;
  const C = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 3 : 0; // surface gap between segments
  let offset = 0;
  const focus = active !== null ? slices[active] : null;

  return (
    <div className="row row-wrap" style={{ gap: 24, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, margin: '0 auto' }}>
        <svg viewBox="0 0 180 180" width={size} height={size} role="img" aria-label="Spending by category">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="18" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.total / total) * C;
              const dash = Math.max(len - gap, 0.5);
              const el = (
                <motion.circle
                  key={s.category}
                  cx="90"
                  cy="90"
                  r={r}
                  fill="none"
                  stroke={s.color || categoryMeta(s.category).color}
                  strokeWidth={active === i ? 22 : 18}
                  strokeLinecap="butt"
                  transform="rotate(-90 90 90)"
                  initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -offset }}
                  animate={{ strokeDasharray: `${dash} ${C - dash}`, strokeDashoffset: -offset }}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  style={{ cursor: 'pointer', transition: 'stroke-width .2s' }}
                >
                  <title>{`${s.category}: ${formatMoney(s.total, currency)} (${Math.round((s.total / total) * 100)}%)`}</title>
                </motion.circle>
              );
              offset += len;
              return el;
            })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <div>
            <div className="tiny muted">{focus ? focus.category : 'Total spent'}</div>
            <div className="num bold" style={{ fontSize: 20, fontFamily: 'var(--font-display)' }}>
              {formatMoney(focus ? focus.total : total, currency, { compact: true })}
            </div>
            {focus && <div className="tiny faint">{Math.round((focus.total / total) * 100)}%</div>}
          </div>
        </div>
      </div>

      <div className="chart-legend grow" style={{ minWidth: 200 }}>
        {slices.length === 0 && <p className="muted small">No expenses this month yet.</p>}
        {slices.map((s, i) => (
          <div
            key={s.category}
            className="legend-row"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            style={{ opacity: active === null || active === i ? 1 : 0.5, transition: 'opacity .2s' }}
          >
            {s.category === 'Everything else' ? (
              <span className="dot" style={{ background: s.color, width: 10, height: 10, margin: '0 9px' }} />
            ) : (
              <CategoryIcon name={s.category} size={28} />
            )}
            <span className="grow truncate">{s.category}</span>
            <span className="num bold">{formatMoney(s.total, currency)}</span>
            <span className="num faint tiny" style={{ width: 36, textAlign: 'right' }}>
              {Math.round((s.total / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Income vs expense for the last 6 months — grouped bars on one axis, with a legend
 * and a hover tooltip per month.
 */
export function TrendBars({ data = [], currency, height = 200 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const W = 560;
  const H = height;
  const pad = { t: 12, b: 28, l: 4, r: 4 };
  const groupW = (W - pad.l - pad.r) / Math.max(data.length, 1);
  const barW = Math.min(20, groupW / 3.2);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const label = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
  const bar = (x, v) => {
    const top = y(v);
    const h = H - pad.b - top;
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    return `M${x},${H - pad.b} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - pad.b} Z`;
  };

  return (
    <div>
      <div className="row small muted" style={{ gap: 16, marginBottom: 10 }}>
        <span className="row" style={{ gap: 6 }}>
          <span className="dot" style={{ background: 'var(--success)' }} /> Income
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span className="dot" style={{ background: 'var(--accent)' }} /> Expense
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto' }} role="img" aria-label="Income and expenses, last 6 months">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={H - pad.b} y2={H - pad.b} stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />
          {data.map((d, i) => {
            const cx = pad.l + groupW * i + groupW / 2;
            return (
              <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + groupW * i} y={0} width={groupW} height={H} fill={hover === i ? 'var(--accent-softer)' : 'transparent'} rx="10" />
                <motion.path
                  d={bar(cx - barW - 1, d.income)}
                  fill="var(--success)"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  style={{ transformOrigin: `0px ${H - pad.b}px` }}
                  transition={{ duration: 0.7, delay: i * 0.06 }}
                />
                <motion.path
                  d={bar(cx + 1, d.expense)}
                  fill="var(--accent)"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  style={{ transformOrigin: `0px ${H - pad.b}px` }}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.05 }}
                />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--text-3)">
                  {label(d.month)}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && data[hover] && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: 0,
              left: `${((hover + 0.5) / data.length) * 100}%`,
              transform: `translateX(${hover > data.length / 2 ? '-105%' : '5%'})`,
              padding: '10px 12px',
              fontSize: 13,
              pointerEvents: 'none',
              background: 'var(--surface-solid)',
              boxShadow: 'var(--shadow)',
              minWidth: 150,
            }}
          >
            <div className="bold" style={{ marginBottom: 4 }}>
              {new Date(`${data[hover].month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <div className="row between">
              <span className="muted">Income</span>
              <span className="num bold">{formatMoney(data[hover].income, currency)}</span>
            </div>
            <div className="row between">
              <span className="muted">Expense</span>
              <span className="num bold">{formatMoney(data[hover].expense, currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tiny 7-day activity sparkline (completed tasks per day) */
export function ActivityBars({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="row" style={{ alignItems: 'flex-end', gap: 6, height: 70 }}>
      {data.map((d, i) => (
        <div key={d.day} className="stack" style={{ flex: 1, alignItems: 'center', gap: 6 }} title={`${d.count} completed`}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: Math.max(4, (d.count / max) * 48) }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            style={{ width: '100%', maxWidth: 22, borderRadius: '4px 4px 2px 2px', background: d.count ? 'var(--gradient)' : 'var(--surface-2)' }}
          />
          <span className="tiny faint">{new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  );
}
