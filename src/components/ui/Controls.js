'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useInView } from 'framer-motion';

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

/** Pill-style segmented control with a sliding highlight */
export function Segmented({ value, onChange, options, size }) {
  const id = useId();
  return (
    <div className="segmented" role="group" style={size === 'block' ? { display: 'flex', width: '100%' } : undefined}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          style={size === 'block' ? { flex: 1, justifyContent: 'center' } : undefined}
        >
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          {o.icon && <o.icon />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ value, onChange, tabs }) {
  const id = useId();
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.icon && <t.icon />}
          {t.label}
          {t.count > 0 && <span className="count">{t.count}</span>}
          {value === t.value && <motion.span layoutId={`tab-${id}`} className="tab-line" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ user, size }) {
  const cls = `avatar ${size ? `avatar-${size}` : ''}`;
  const name = user?.name || user?.email || '?';
  if (user?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={name} className={cls} referrerPolicy="no-referrer" />;
  }
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className={cls} title={name} aria-label={name}>
      {initials}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {Icon && (
        <motion.div className="empty-icon" initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Icon />
        </motion.div>
      )}
      <h3>{title}</h3>
      {text && <p style={{ maxWidth: 340 }}>{text}</p>}
      {action}
    </motion.div>
  );
}

export function Skeleton({ h = 60, w = '100%', r, style }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkeletonList({ rows = 5, h = 62 }) {
  return (
    <div className="stack stack-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} h={h} style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/** Counts up to a value when it scrolls into view */
export function AnimatedNumber({ value = 0, format = (v) => Math.round(v).toLocaleString() }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView]);

  return (
    <span ref={ref} className="num">
      {format(display)}
    </span>
  );
}

/** Animated progress bar */
export function Progress({ value, max = 100, tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const cls = tone || (pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '');
  return (
    <div className={`progress ${cls}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
