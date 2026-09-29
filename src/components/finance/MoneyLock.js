'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import PinPad from '@/components/ui/PinPad';
import { checkPin, hasLock, isUnlocked, markUnlocked } from '@/lib/client/lock';
import { logout } from '@/lib/client/session';

/** Shows a PIN screen in front of the Money page when the lock is turned on (Settings → Money lock) */
export default function MoneyLock({ children }) {
  const [state, setState] = useState('checking');
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    setState(!hasLock() || isUnlocked() ? 'open' : 'locked');
  }, []);

  if (state === 'checking') return null;
  if (state === 'open') return children;

  return (
    <motion.div className="lock-screen" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <motion.span className="lock-icon" initial={{ rotate: -12, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
        <Lock />
      </motion.span>
      <h2>Money is locked</h2>
      <p className="muted small">Enter your 4-digit PIN to see your spending.</p>
      <PinPad
        onDone={async (pin) => {
          if (await checkPin(pin)) {
            markUnlocked();
            setState('open');
            return true;
          }
          return false;
        }}
      />
      {!forgot ? (
        <button className="btn btn-ghost btn-sm" onClick={() => setForgot(true)}>
          Forgot PIN?
        </button>
      ) : (
        <div className="card" style={{ padding: 14, maxWidth: 320, textAlign: 'center' }}>
          <p className="small" style={{ margin: '0 0 10px' }}>Sign out and sign back in — that removes the lock from this device. Your data stays safe.</p>
          <button className="btn btn-soft btn-sm" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      )}
    </motion.div>
  );
}
