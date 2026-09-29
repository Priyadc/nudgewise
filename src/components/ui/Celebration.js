'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { on } from '@/lib/client/api';

const CONFETTI = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f97316'];

const ANIMALS = {
  kitten: { fur: '#FFC98B', belly: '#FFF3E0', inner: '#FF9EB5', line: '#4A2E1A' },
  bunny: { fur: '#F4F1FF', belly: '#FFFFFF', inner: '#FFB3C7', line: '#43345C' },
  panda: { fur: '#FFFFFF', belly: '#FFFFFF', inner: '#2B2B3A', line: '#2B2B3A', patch: '#2B2B3A' },
};

/** A little original party animal, drawn in SVG. Arms wave, feet tap, body bops. */
function Dancer({ kind }) {
  const c = ANIMALS[kind];
  const ears =
    kind === 'bunny' ? (
      <g className="ears-bunny">
        <ellipse cx="62" cy="22" rx="11" ry="30" fill={c.fur} stroke={c.line} strokeWidth="3" transform="rotate(-12 62 22)" />
        <ellipse cx="62" cy="24" rx="5" ry="20" fill={c.inner} transform="rotate(-12 62 24)" />
        <ellipse cx="98" cy="22" rx="11" ry="30" fill={c.fur} stroke={c.line} strokeWidth="3" transform="rotate(12 98 22)" />
        <ellipse cx="98" cy="24" rx="5" ry="20" fill={c.inner} transform="rotate(12 98 24)" />
      </g>
    ) : kind === 'panda' ? (
      <g>
        <circle cx="50" cy="42" r="14" fill={c.patch} />
        <circle cx="110" cy="42" r="14" fill={c.patch} />
      </g>
    ) : (
      <g>
        <path d="M46 52 L44 16 L74 40 Z" fill={c.fur} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
        <path d="M51 44 L50 26 L65 38 Z" fill={c.inner} />
        <path d="M114 52 L116 16 L86 40 Z" fill={c.fur} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
        <path d="M109 44 L110 26 L95 38 Z" fill={c.inner} />
      </g>
    );

  return (
    <svg viewBox="0 0 160 200" className="dancer" aria-hidden="true">
      {/* tail */}
      {kind === 'kitten' && <path className="tail" d="M112 150 C 140 150, 146 118, 132 104" fill="none" stroke={c.fur} strokeWidth="11" strokeLinecap="round" />}
      {kind === 'bunny' && <circle className="tail" cx="118" cy="152" r="10" fill="#fff" stroke={c.line} strokeWidth="3" />}
      {/* legs */}
      <g className="leg leg-l">
        <ellipse cx="64" cy="182" rx="15" ry="10" fill={kind === 'panda' ? c.patch : c.fur} stroke={c.line} strokeWidth="3" />
      </g>
      <g className="leg leg-r">
        <ellipse cx="96" cy="182" rx="15" ry="10" fill={kind === 'panda' ? c.patch : c.fur} stroke={c.line} strokeWidth="3" />
      </g>
      {/* body */}
      <ellipse cx="80" cy="145" rx="40" ry="38" fill={c.fur} stroke={c.line} strokeWidth="3" />
      <ellipse cx="80" cy="152" rx="24" ry="24" fill={c.belly} />
      {/* arms */}
      <g className="arm arm-l">
        <rect x="26" y="96" width="18" height="44" rx="9" fill={kind === 'panda' ? c.patch : c.fur} stroke={c.line} strokeWidth="3" />
      </g>
      <g className="arm arm-r">
        <rect x="116" y="96" width="18" height="44" rx="9" fill={kind === 'panda' ? c.patch : c.fur} stroke={c.line} strokeWidth="3" />
      </g>
      {/* head */}
      <g className="head">
        {ears}
        <circle cx="80" cy="72" r="42" fill={c.fur} stroke={c.line} strokeWidth="3" />
        {kind === 'panda' && (
          <>
            <ellipse cx="63" cy="72" rx="11" ry="13" fill={c.patch} transform="rotate(-20 63 72)" />
            <ellipse cx="97" cy="72" rx="11" ry="13" fill={c.patch} transform="rotate(20 97 72)" />
          </>
        )}
        {/* happy closed eyes */}
        <path d="M58 72 q6 -9 12 0" fill="none" stroke={kind === 'panda' ? '#fff' : c.line} strokeWidth="4" strokeLinecap="round" />
        <path d="M90 72 q6 -9 12 0" fill="none" stroke={kind === 'panda' ? '#fff' : c.line} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="56" cy="88" rx="7" ry="4.5" fill="#FF9EB5" opacity="0.7" />
        <ellipse cx="104" cy="88" rx="7" ry="4.5" fill="#FF9EB5" opacity="0.7" />
        <path d="M76 82 h8 l-4 5 z" fill={kind === 'panda' ? c.patch : '#FF7A9A'} />
        <path d="M72 90 q8 9 16 0" fill="#7A2E3A" stroke={c.line} strokeWidth="2.5" strokeLinejoin="round" />
        {/* party hat */}
        <g className="hat">
          <path d="M66 36 L80 2 L94 36 Z" fill="#8b5cf6" stroke={c.line} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M71 26 L89 26 M75 16 L85 16" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="3" r="5" fill="#F59E0B" />
        </g>
      </g>
    </svg>
  );
}

/** Full-screen celebration: confetti + a dancing animal. Triggered with emit('celebrate', { title, sub }) */
export default function Celebration() {
  const [show, setShow] = useState(null);

  useEffect(
    () =>
      on('celebrate', (detail) => {
        const kinds = Object.keys(ANIMALS);
        setShow({ ...detail, animal: detail?.animal || kinds[Math.floor(Math.random() * kinds.length)], key: Date.now() });
      }),
    []
  );

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(null), 5200);
    const onKey = (e) => e.key === 'Escape' && setShow(null);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [show]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.2 + Math.random() * 1.8,
        color: CONFETTI[i % CONFETTI.length],
        size: 6 + Math.random() * 7,
        spin: Math.random() > 0.5 ? 1 : -1,
        round: Math.random() > 0.6,
      })),
    // New confetti for every celebration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show?.key]
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div key={show.key} className="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow(null)} role="status" aria-live="polite">
          <div className="confetti" aria-hidden="true">
            {pieces.map((p, i) => (
              <span
                key={i}
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.round ? p.size : p.size * 0.45,
                  borderRadius: p.round ? '50%' : 2,
                  background: p.color,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.dur}s`,
                  '--spin': `${p.spin * 720}deg`,
                }}
              />
            ))}
          </div>
          <motion.div
            className="celebrate-card"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dance-floor">
              <span className="note n1">♪</span>
              <span className="note n2">♫</span>
              <span className="note n3">✦</span>
              <Dancer kind={show.animal} />
              <span className="floor-shadow" />
            </div>
            <h2>{show.title || 'Yay! 🎉'}</h2>
            {show.sub && <p>{show.sub}</p>}
            <button className="btn btn-primary" onClick={() => setShow(null)}>
              {show.button || 'Woohoo!'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
