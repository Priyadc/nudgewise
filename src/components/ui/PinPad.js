'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Delete } from 'lucide-react';

/** 4-digit PIN entry with a keypad (keyboard works too). Calls onDone(pin); return false to shake + clear. */
export default function PinPad({ onDone, label = 'Enter your PIN' }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const controls = useAnimationControls();

  async function submit(value) {
    setBusy(true);
    const ok = await onDone(value);
    setBusy(false);
    if (ok === false) {
      controls.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } });
      setPin('');
    }
  }

  function press(d) {
    if (busy) return;
    setPin((p) => {
      if (p.length >= 4) return p;
      const next = p + d;
      if (next.length === 4) setTimeout(() => submit(next), 120);
      return next;
    });
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return (
    <div className="pinpad">
      <div className="small bold muted">{label}</div>
      <motion.div className="pin-dots" animate={controls} aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </motion.div>
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button key={i} type="button" className="pin-key" onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))} aria-label={k === 'del' ? 'Delete digit' : k} disabled={busy}>
              {k === 'del' ? <Delete /> : k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
